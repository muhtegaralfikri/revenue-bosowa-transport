import {
  Injectable,
  OnModuleInit,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);
  private readonly shouldSeed: boolean;

  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private readonly configService: ConfigService,
  ) {
    this.shouldSeed = this.configService.get<string>('SEED_DEFAULT_USERS', 'true') === 'true';
  }

  async onModuleInit() {
    if (!this.shouldSeed) {
      this.logger.log('Seeding default users skipped (SEED_DEFAULT_USERS=false)');
      return;
    }
    await this.seedInitialData();
  }

  private async seedInitialData() {
    try {
      const adminEmail = 'admin@example.com';
      const adminUser = await this.usersRepository.findOne({ where: { email: adminEmail } });

      if (!adminUser) {
        const newAdmin = this.usersRepository.create({
          username: 'Admin Bosowa',
          email: adminEmail,
          password: 'password123',
        });
        await this.usersRepository.save(newAdmin);
        this.logger.log('Admin user created successfully');
      }
    } catch (error) {
      this.logger.error('Failed to seed initial data', error);
    }
  }

  async findOneByUsername(username: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findOneByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findOneById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findAll() {
    const users = await this.usersRepository.find({ order: { createdAt: 'DESC' } });
    return users.map((user) => this.toSafeUser(user));
  }

  async findOneSafe(id: string) {
    const user = await this.findOneById(id);
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }
    return this.toSafeUser(user);
  }

  async createUser(createUserDto: CreateUserDto) {
    await this.ensureUniqueEmail(createUserDto.email);
    await this.ensureUniqueUsername(createUserDto.username);

    const newUser = this.usersRepository.create({
      username: createUserDto.username,
      email: createUserDto.email,
      password: createUserDto.password,
    });

    const saved = await this.usersRepository.save(newUser);
    return this.toSafeUser(saved);
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOneById(id);
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (
      updateUserDto.email &&
      updateUserDto.email.toLowerCase() !== user.email.toLowerCase()
    ) {
      await this.ensureUniqueEmail(updateUserDto.email);
      user.email = updateUserDto.email;
    }

    if (
      updateUserDto.username &&
      updateUserDto.username.toLowerCase() !== user.username.toLowerCase()
    ) {
      await this.ensureUniqueUsername(updateUserDto.username);
      user.username = updateUserDto.username;
    }

    if (updateUserDto.password) {
      user.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updated = await this.usersRepository.save(user);
    return this.toSafeUser(updated);
  }

  async removeUser(id: string) {
    const result = await this.usersRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException('User tidak ditemukan');
    }
    return { success: true };
  }

  private async ensureUniqueEmail(email: string) {
    const existing = await this.usersRepository.findOne({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email sudah digunakan');
    }
  }

  private async ensureUniqueUsername(username: string) {
    const existing = await this.usersRepository.findOne({ where: { username } });
    if (existing) {
      throw new BadRequestException('Username sudah digunakan');
    }
  }

  private toSafeUser(user: UserEntity) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
    };
  }
}
