// /backend/src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService, // Kita inject UsersService
  ) {
    super({
      // Cara mengambil token: dari Header 'Authorization' sebagai 'Bearer' token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // Token yang expired akan ditolak
      // MENJADI INI:
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'), // Pakai secret dari .env
    });
  }

  /**
   * Passport akan otomatis memanggil method 'validate' ini
   * setelah token berhasil diverifikasi.
   * 'payload' adalah data yang kita masukkan ke token (saat login).
   */
  async validate(payload: any) {
    // payload kita berisi: { username, sub (id), role }
    
    // Kita bisa tambahkan cek ke DB untuk memastikan user masih ada
    // (Walaupun di payload sudah ada data, ini lebih aman)
    const user = await this.usersService.findOneById(payload.sub); // Kita perlu buat method ini
    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    // Data yang kita 'return' di sini akan disisipkan ke
    // object 'req.user' di semua endpoint yang terproteksi
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}