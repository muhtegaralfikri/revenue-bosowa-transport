import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RevenueQueryDto {
  @ApiPropertyOptional({ description: 'Tahun', example: 2025 })
  @IsNumber()
  @Min(2020)
  @Max(2100)
  @IsOptional()
  @Type(() => Number)
  year?: number;

  @ApiPropertyOptional({ description: 'Bulan (1-12)', example: 1 })
  @IsNumber()
  @Min(1)
  @Max(12)
  @IsOptional()
  @Type(() => Number)
  month?: number;

  @ApiPropertyOptional({ description: 'Company ID' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  companyId?: number;
}
