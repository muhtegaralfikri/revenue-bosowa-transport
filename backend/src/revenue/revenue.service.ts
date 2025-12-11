import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CompanyEntity } from './entities/company.entity';
import { RevenueTargetEntity } from './entities/revenue-target.entity';
import { RevenueRealizationEntity } from './entities/revenue-realization.entity';
import { CreateRealizationDto } from './dto/create-realization.dto';
import { CreateTargetDto } from './dto/create-target.dto';
import { RevenueQueryDto } from './dto/revenue-query.dto';

@Injectable()
export class RevenueService {
  constructor(
    @InjectRepository(CompanyEntity)
    private companyRepo: Repository<CompanyEntity>,
    @InjectRepository(RevenueTargetEntity)
    private targetRepo: Repository<RevenueTargetEntity>,
    @InjectRepository(RevenueRealizationEntity)
    private realizationRepo: Repository<RevenueRealizationEntity>,
  ) {}

  // === Companies ===
  async getAllCompanies() {
    return this.companyRepo.find({ where: { isActive: true }, order: { id: 'ASC' } });
  }

  async seedCompanies() {
    const companies = [
      { name: 'Bosowa Bandar Indonesia', code: 'BBI' },
      { name: 'Bosowa Bandar Agensi', code: 'BBA' },
      { name: 'Jasa Pelabuhan Indonesia', code: 'JAPELIN' },
    ];

    for (const company of companies) {
      const exists = await this.companyRepo.findOne({ where: { code: company.code } });
      if (!exists) {
        await this.companyRepo.save(this.companyRepo.create(company));
      }
    }
    return { message: 'Companies seeded successfully' };
  }

  // === Targets ===
  async createTarget(dto: CreateTargetDto) {
    const company = await this.companyRepo.findOne({ where: { id: dto.companyId } });
    if (!company) throw new NotFoundException('Company not found');

    const existing = await this.targetRepo.findOne({
      where: { companyId: dto.companyId, year: dto.year, month: dto.month },
    });

    if (existing) {
      existing.targetAmount = dto.targetAmount;
      return this.targetRepo.save(existing);
    }

    const target = this.targetRepo.create({
      companyId: dto.companyId,
      year: dto.year,
      month: dto.month,
      targetAmount: dto.targetAmount,
    });
    return this.targetRepo.save(target);
  }

  async getTargets(query: RevenueQueryDto) {
    const where: any = {};
    if (query.year) where.year = query.year;
    if (query.month) where.month = query.month;
    if (query.companyId) where.companyId = query.companyId;

    return this.targetRepo.find({
      where,
      relations: ['company'],
      order: { year: 'DESC', month: 'DESC' },
    });
  }

  // === Realizations ===
  async createRealization(dto: CreateRealizationDto, userId?: string) {
    const company = await this.companyRepo.findOne({ where: { id: dto.companyId } });
    if (!company) throw new NotFoundException('Company not found');

    const dateOnly = dto.date.split('T')[0];
    const targetDate = new Date(dateOnly + 'T00:00:00');

    const existing = await this.realizationRepo
      .createQueryBuilder('r')
      .where('r.company_id = :companyId', { companyId: dto.companyId })
      .andWhere('DATE(r.date) = :date', { date: dateOnly })
      .getOne();

    if (existing) {
      existing.amount = dto.amount;
      existing.description = dto.description || existing.description;
      existing.userId = userId || existing.userId;
      return this.realizationRepo.save(existing);
    }

    const realization = this.realizationRepo.create({
      companyId: dto.companyId,
      date: targetDate,
      amount: dto.amount,
      description: dto.description,
      userId,
    });
    return this.realizationRepo.save(realization);
  }

  async getRealizations(query: RevenueQueryDto) {
    const year = query.year || new Date().getFullYear();
    const month = query.month || new Date().getMonth() + 1;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const where: any = {
      date: Between(startDate, endDate),
    };
    if (query.companyId) where.companyId = query.companyId;

    return this.realizationRepo.find({
      where,
      relations: ['company', 'user'],
      order: { date: 'DESC' },
    });
  }

  // === Summary ===
  async getSummary(query: RevenueQueryDto) {
    const year = query.year || new Date().getFullYear();
    const month = query.month || new Date().getMonth() + 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const companies = await this.companyRepo.find({ where: { isActive: true } });

    const result = await Promise.all(
      companies.map(async (company) => {
        // Get target for this month
        const target = await this.targetRepo.findOne({
          where: { companyId: company.id, year, month },
        });
        const targetAmount = target ? Number(target.targetAmount) : 0;
        const dailyTarget = targetAmount / new Date(year, month, 0).getDate();

        // Get today's realization
        const todayRealization = await this.realizationRepo.findOne({
          where: { companyId: company.id, date: today },
        });
        const todayAmount = todayRealization ? Number(todayRealization.amount) : 0;

        // Get month's total realization
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const monthRealizations = await this.realizationRepo.find({
          where: { companyId: company.id, date: Between(startDate, endDate) },
        });
        const monthTotal = monthRealizations.reduce((sum, r) => sum + Number(r.amount), 0);

        const percentage = dailyTarget > 0 ? (todayAmount / dailyTarget) * 100 : 0;
        const monthPercentage = targetAmount > 0 ? (monthTotal / targetAmount) * 100 : 0;

        return {
          company: {
            id: company.id,
            name: company.name,
            code: company.code,
          },
          today: {
            realisasi: todayAmount,
            target: dailyTarget,
            percentage: Math.round(percentage * 10) / 10,
          },
          month: {
            realisasi: monthTotal,
            target: targetAmount,
            percentage: Math.round(monthPercentage * 10) / 10,
          },
        };
      }),
    );

    return {
      year,
      month,
      date: today.toISOString().split('T')[0],
      companies: result,
    };
  }

  // === Trend ===
  async getTrend(query: RevenueQueryDto) {
    const year = query.year || new Date().getFullYear();
    const month = query.month || new Date().getMonth() + 1;

    const daysInMonth = new Date(year, month, 0).getDate();
    const companies = await this.companyRepo.find({ where: { isActive: true } });

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));

    const datasets = await Promise.all(
      companies.map(async (company) => {
        const realizations = await this.realizationRepo.find({
          where: { companyId: company.id, date: Between(startDate, endDate) },
          order: { date: 'ASC' },
        });

        const data = Array(daysInMonth).fill(0);
        realizations.forEach((r) => {
          const day = new Date(r.date).getDate() - 1;
          data[day] = Number(r.amount) / 1000000; // Convert to millions
        });

        return {
          company: company.code,
          companyName: company.name,
          data,
        };
      }),
    );

    return {
      year,
      month,
      labels,
      datasets,
    };
  }

  // === Yearly Comparison ===
  async getYearlyComparison(year?: number) {
    const targetYear = year || new Date().getFullYear();
    const companies = await this.companyRepo.find({ where: { isActive: true } });

    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

    const datasets = await Promise.all(
      companies.map(async (company) => {
        const targetData: number[] = [];
        const realisasiData: number[] = [];

        for (const month of months) {
          // Get target
          const target = await this.targetRepo.findOne({
            where: { companyId: company.id, year: targetYear, month },
          });
          targetData.push(target ? Number(target.targetAmount) / 1000000 : 0);

          // Get realization sum for the month
          const startDate = new Date(targetYear, month - 1, 1);
          const endDate = new Date(targetYear, month, 0);
          const realizations = await this.realizationRepo.find({
            where: { companyId: company.id, date: Between(startDate, endDate) },
          });
          const monthTotal = realizations.reduce((sum, r) => sum + Number(r.amount), 0);
          realisasiData.push(monthTotal / 1000000);
        }

        return {
          company: company.code,
          companyName: company.name,
          target: targetData,
          realisasi: realisasiData,
        };
      }),
    );

    return {
      year: targetYear,
      labels,
      datasets,
    };
  }
}
