// /backend/src/stock/dto/create-stock-out.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';

const toNumber = (value: unknown) => {
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim();
    return Number(normalized);
  }
  return value as number;
};

export class CreateStockOutDto {
  @ApiProperty({
    description: 'Jumlah liter stok yang dipakai',
    example: 50.25,
  })
  @IsNotEmpty()
  @Transform(({ value }) => toNumber(value))
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

  @ApiProperty({
    description:
      'Tanggal dan waktu pemakaian (ISO 8601). Default akan memakai waktu input saat ini bila tidak diisi.',
    example: '2024-01-13T08:00:00+08:00',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  timestamp?: string;
}
