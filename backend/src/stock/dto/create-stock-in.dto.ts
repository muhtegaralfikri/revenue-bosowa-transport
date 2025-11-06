// /backend/src/stock/dto/create-stock-in.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsString, IsOptional } from 'class-validator';

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
}