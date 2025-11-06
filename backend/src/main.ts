// Buka file: /backend/src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// Import Swagger
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common'; // <-- Impor

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe()); // <-- TAMBAHKAN INI
  // --- Mulai Konfigurasi Swagger ---
  const config = new DocumentBuilder()
    .setTitle('Fuel Ledger System API')
    .setDescription('Dokumentasi API untuk Sistem Manajemen Stok Bahan Bakar Bosowa')
    .setVersion('1.0')
    .addTag('stock', 'Operasi manajemen stok')
    .addTag('auth', 'Autentikasi Pengguna')
    // Kita tambahkan ini nanti saat implementasi JWT
    .addBearerAuth() 
    .build();

  const document = SwaggerModule.createDocument(app, config);
  // 'api' adalah path untuk mengakses UI Swagger-nya
  SwaggerModule.setup('api', app, document); 
  // --- Selesai Konfigurasi Swagger ---

  await app.listen(3000); // Atau port lain, misal 3001
}
bootstrap();