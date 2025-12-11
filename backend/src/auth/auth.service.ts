// /backend/src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserEntity } from 'src/users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { AuthSessionDto, AuthenticatedUserDto } from './dto/auth-session.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
  ) {
    this.accessTokenTtlSeconds = this.parseNumberEnv(
      this.configService.get<string>('JWT_ACCESS_TTL_SECONDS', '86400'),
      86400,
    );
    const refreshTtlSeconds = this.parseNumberEnv(
      this.configService.get<string>('JWT_REFRESH_TTL_SECONDS', '604800'),
      604800,
    );
    this.refreshTokenTtlMs = refreshTtlSeconds * 1000;
  }

  private readonly accessTokenTtlSeconds: number;
  private readonly refreshTokenTtlMs: number;

  /**
   * Memvalidasi user (dipakai oleh LocalStrategy)
   * @param email - Ganti dari username
   * @param pass - Password dari body
   * @returns User object jika valid, null jika tidak
   */
  async validateUser(email: string, pass: string): Promise<any> {
    // 1. Cari user berdasarkan email
    const user = await this.usersService.findOneByEmail(email); // <-- Ganti method
    if (!user) {
      return null; // User tidak ditemukan
    }

    // 2. Bandingkan password (ini tetap sama)
    const isPasswordMatching = await bcrypt.compare(pass, user.password);
    if (isPasswordMatching) {
      // 3. Jika cocok, kembalikan user (tanpa password)
      const { password, ...result } = user;
      return result;
    }

    return null; // Password salah
  }

  /**
   * Membuat JWT Token (dipakai oleh AuthController)
   * @param user - User object yang sudah divalidasi
   * @returns object berisi access_token
   */
  async login(user: Omit<UserEntity, 'password'>): Promise<AuthSessionDto> {
    const persistedUser = await this.usersService.findOneById(user.id);
    if (!persistedUser) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    await this.revokeTokensForUser(persistedUser.id);
    const refreshToken = await this.createRefreshToken(persistedUser.id);

    return {
      accessToken: this.createAccessToken(persistedUser),
      refreshToken,
      expiresIn: this.accessTokenTtlSeconds,
      user: this.toAuthUser(persistedUser),
    };
  }

  async refreshTokens(rawToken: string) {
    const [tokenId, tokenSecret] = rawToken?.split('.') ?? [];
    if (!tokenId || !tokenSecret) {
      throw new UnauthorizedException('Refresh token tidak valid');
    }

    const stored = await this.refreshTokenRepository.findOne({
      where: { id: tokenId },
      relations: ['user'],
    });

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Refresh token tidak valid atau kedaluwarsa');
    }

    const match = await bcrypt.compare(tokenSecret, stored.tokenHash);
    if (!match) {
      throw new UnauthorizedException('Refresh token tidak valid');
    }

    await this.refreshTokenRepository.update(stored.id, {
      revokedAt: new Date(),
    });

    const latestUser = await this.usersService.findOneById(stored.user.id);
    if (!latestUser) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    return this.login(latestUser);
  }

  async logout(userId: string) {
    await this.revokeTokensForUser(userId);
    return { success: true };
  }

  async getProfile(userId: string): Promise<AuthenticatedUserDto> {
    const user = await this.usersService.findOneById(userId);
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }
    return this.toAuthUser(user);
  }

  private createAccessToken(user: UserEntity) {
    const payload = {
      username: user.username,
      sub: user.id,
    };
    return this.jwtService.sign(payload);
  }

  private async createRefreshToken(userId: string) {
    const secret = randomBytes(48).toString('hex');
    const tokenHash = await bcrypt.hash(secret, 10);
    const entity = this.refreshTokenRepository.create({
      tokenHash,
      expiresAt: new Date(Date.now() + this.refreshTokenTtlMs),
      revokedAt: null,
      user: { id: userId } as UserEntity,
    });

    const saved = await this.refreshTokenRepository.save(entity);
    return `${saved.id}.${secret}`;
  }

  private async revokeTokensForUser(userId: string) {
    await this.refreshTokenRepository.update(
      { user: { id: userId }, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private toAuthUser(user: UserEntity): AuthenticatedUserDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
    };
  }

  private parseNumberEnv(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
}
