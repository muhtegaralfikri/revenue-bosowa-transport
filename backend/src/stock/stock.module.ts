// /backend/src/stock/stock.module.ts
import { Module } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { TypeOrmModule } from '@nestjs/typeorm'; // <-- Impor
import { TransactionEntity } from './entities/transaction.entity'; // <-- Impor

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionEntity]), // <-- Daftarkan di sini
  ],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}