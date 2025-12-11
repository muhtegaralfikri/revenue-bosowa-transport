import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RevenueModule } from './revenue/revenue.module';
import { SheetsModule } from './sheets/sheets.module';

const runtimeEnv = process.env.NODE_ENV ?? 'development';
const envFiles = [`.env.${runtimeEnv}`, '.env'];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFiles,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const type = (config.get<string>('DB_TYPE') || 'postgres').toLowerCase();
        const synchronize = config.get<string>('DB_SYNCHRONIZE', 'false') === 'true';
        const logging = config.get<string>('DB_LOGGING', 'false') === 'true';

        const baseConfig = {
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize,
          logging,
        };

        if (type === 'mysql' || type === 'mariadb') {
          return {
            ...baseConfig,
            type: 'mariadb' as const,
            host: config.get<string>('DB_HOST', '127.0.0.1'),
            port: parseInt(config.get<string>('DB_PORT', '3306'), 10),
            username: config.get<string>('DB_USERNAME', 'root'),
            password: config.get<string>('DB_PASSWORD', ''),
            database: config.get<string>('DB_NAME', 'revenue'),
          };
        }

        const useSsl = config.get<string>('DB_SSL', 'true') === 'true';
        return {
          ...baseConfig,
          type: 'postgres' as const,
          url: config.get<string>('DATABASE_URL'),
          ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
        };
      },
    }),

    AuthModule,
    UsersModule,
    RevenueModule,
    SheetsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
