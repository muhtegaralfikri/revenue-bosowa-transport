import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api');

  const corsOrigins = (configService.get<string>('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173') || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const enableCors = configService.get<string>('ENABLE_CORS', 'true') === 'true';

  if (enableCors) {
    app.enableCors({
      origin: corsOrigins.length ? corsOrigins : true,
      credentials: true,
    });
  }

  app.useGlobalPipes(new ValidationPipe());

  const swaggerEnabledEnv = configService.get<string>('ENABLE_SWAGGER');
  const isSwaggerEnabled =
    swaggerEnabledEnv === 'true' ||
    (!swaggerEnabledEnv && configService.get<string>('NODE_ENV', 'development') !== 'production');

  if (isSwaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Revenue Monitoring System API')
      .setDescription('API untuk Sistem Monitoring Pendapatan Bosowa Bandar Group')
      .setVersion('1.0')
      .addTag('revenue', 'Operasi monitoring pendapatan')
      .addTag('auth', 'Autentikasi Pengguna')
      .addTag('users', 'Manajemen Pengguna')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = parseInt(configService.get<string>('APP_PORT', '3000'), 10);
  await app.listen(port);
}
bootstrap();
