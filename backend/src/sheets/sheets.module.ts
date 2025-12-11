import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SheetsService } from './sheets.service';
import { SheetsController } from './sheets.controller';
import { CompanyEntity } from '../revenue/entities/company.entity';
import { RevenueTargetEntity } from '../revenue/entities/revenue-target.entity';
import { RevenueRealizationEntity } from '../revenue/entities/revenue-realization.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      CompanyEntity,
      RevenueTargetEntity,
      RevenueRealizationEntity,
    ]),
  ],
  controllers: [SheetsController],
  providers: [SheetsService],
  exports: [SheetsService],
})
export class SheetsModule {}
