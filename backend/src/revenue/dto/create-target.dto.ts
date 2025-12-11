import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator';

export class CreateTargetDto {
  @ApiProperty({ description: 'Company ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  companyId: number;

  @ApiProperty({ description: 'Tahun', example: 2025 })
  @IsNumber()
  @Min(2020)
  @Max(2100)
  @IsNotEmpty()
  year: number;

  @ApiProperty({ description: 'Bulan (1-12)', example: 1 })
  @IsNumber()
  @Min(1)
  @Max(12)
  @IsNotEmpty()
  month: number;

  @ApiProperty({ description: 'Target bulanan dalam Rupiah', example: 5000000000 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  targetAmount: number;
}
