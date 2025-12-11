import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateRealizationDto {
  @ApiProperty({ description: 'Company ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  companyId: number;

  @ApiProperty({ description: 'Tanggal realisasi', example: '2025-01-15' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Jumlah realisasi dalam Rupiah', example: 150000000 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'Keterangan', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
