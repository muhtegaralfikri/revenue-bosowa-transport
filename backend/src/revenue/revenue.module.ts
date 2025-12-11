import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RevenueService } from './revenue.service';
import { RevenueController } from './revenue.controller';
import { CompanyEntity } from './entities/company.entity';
import { RevenueTargetEntity } from './entities/revenue-target.entity';
import { RevenueRealizationEntity } from './entities/revenue-realization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CompanyEntity,
      RevenueTargetEntity,
      RevenueRealizationEntity,
    ]),
  ],
  controllers: [RevenueController],
  providers: [RevenueService],
  exports: [RevenueService],
})
export class RevenueModule {}
