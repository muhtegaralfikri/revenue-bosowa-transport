// /backend/src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // Impor ConfigModule
import { TypeOrmModule } from '@nestjs/typeorm'; // Impor TypeOrmModule

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // 1. Load file .env kita secara global
    ConfigModule.forRoot({
      isGlobal: true, // Membuat .env tersedia di semua module
      envFilePath: '.env', // Tentukan path file .env kita
    }),

    // 2. Konfigurasi TypeORM (Database)
    TypeOrmModule.forRootAsync({
      // Gunakan ConfigModule untuk inject konfigurasi
      imports: [ConfigModule],
      useFactory: () => ({
        type: 'postgres', // Tipe database
        url: process.env.DATABASE_URL, // Membaca dari .env!
        
        entities: [__dirname + '/**/*.entity{.ts,.js}'], // Lokasi file-file @Entity kita nanti
        synchronize: true, // PENTING: ini akan otomatis update skema DB. Hanya untuk 'dev', jangan di 'prod'.
        ssl: { // Neon butuh SSL
          rejectUnauthorized: false, 
        },
      }),
    }),
    
   // Nanti kita akan tambahkan module lain di sini
    // (AuthModule, StockModule, etc.)
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}