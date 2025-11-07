// /backend/src/stock/dto/history-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class StockHistoryQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: "Filter jenis transaksi. 'IN' untuk tambah stok, 'OUT' untuk pemakaian.",
    enum: ['IN', 'OUT'],
  })
  @IsOptional()
  @IsIn(['IN', 'OUT'])
  type?: 'IN' | 'OUT';

  @ApiPropertyOptional({
    description: 'Tanggal awal rentang filter (ISO string)',
    example: '2024-05-01T00:00:00+08:00',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Tanggal akhir rentang filter (ISO string)',
    example: '2024-05-07T23:59:59+08:00',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
