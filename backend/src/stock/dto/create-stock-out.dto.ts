// /backend/src/stock/dto/create-stock-out.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsString, IsOptional } from 'class-validator';

export class CreateStockOutDto {
  @ApiProperty({
    description: 'Jumlah liter stok yang dipakai',
    example: 50.25,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Uraian pemakaian (Opsional tapi disarankan)',
    example: 'Pemakaian untuk Kapal X',
  })
  @IsOptional()
  @IsString()
  description: string;
}