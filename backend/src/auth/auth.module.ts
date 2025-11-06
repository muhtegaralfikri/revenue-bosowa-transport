// /backend/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module'; // <-- Impor UsersModule
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from './local.strategy'; // <-- Impor
import { JwtStrategy } from './jwt.strategy'; // <-- Impor
@Module({
  imports: [
    // Impor modul lain yang kita butuhkan
    UsersModule, // Agar bisa inject UsersService
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Konfigurasi JWT Module
    JwtModule.registerAsync({
      imports: [ConfigModule], // Impor ConfigModule
      inject: [ConfigService], // Inject ConfigService
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'), // Baca dari .env
        signOptions: {
          expiresIn: '1d', // Token berlaku 1 hari
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [PassportModule], // Nanti kita tambahkan 'Strategy' di sini
})
export class AuthModule {}
