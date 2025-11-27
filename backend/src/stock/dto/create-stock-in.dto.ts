// /backend/src/stock/dto/create-stock-in.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateStockInDto {
  @ApiProperty({
    description: 'Jumlah liter stok yang masuk',
    example: 100.5,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive() // Pastikan angkanya positif
  amount: number;

  @ApiProperty({
    description: 'Deskripsi/keterangan (Opsional)',
    example: 'Pembelian dari Pertamina Batch #123',
  })
  @IsOptional()
  @IsString()
  description: string;

  @ApiProperty({
    description:
      'Tanggal dan waktu penambahan (ISO 8601). Default menggunakan waktu input bila tidak diisi.',
    example: '2024-01-13T08:00:00+08:00',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  timestamp?: string;
}
