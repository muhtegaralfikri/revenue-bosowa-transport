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

  // === Summary === (Optimized: 4 queries instead of N+1)
  async getSummary(query: RevenueQueryDto) {
    const year = query.year || new Date().getFullYear();
    const month = query.month || new Date().getMonth() + 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const daysInMonth = endDate.getDate();

    // Query 1: Get all companies
    const companies = await this.companyRepo.find({ where: { isActive: true } });

    // Query 2: Get all targets for this month (batch)
    const targets = await this.targetRepo.find({
      where: { year, month },
    });
    const targetMap = new Map(targets.map(t => [t.companyId, Number(t.targetAmount)]));

    // Query 3: Get today's realizations (batch)
    const todayRealizations = await this.realizationRepo.find({
      where: { date: today },
    });
    const todayMap = new Map(todayRealizations.map(r => [r.companyId, Number(r.amount)]));

    // Query 4: Get month totals using SQL aggregation
    const monthTotals = await this.realizationRepo
      .createQueryBuilder('r')
      .select('r.company_id', 'companyId')
      .addSelect('SUM(r.amount)', 'total')
      .where('r.date >= :startDate', { startDate })
      .andWhere('r.date <= :endDate', { endDate })
      .groupBy('r.company_id')
      .getRawMany();
    const monthMap = new Map(monthTotals.map(m => [m.companyId, Number(m.total)]));

    // Build result without additional queries
    const result = companies.map((company) => {
      const targetAmount = targetMap.get(company.id) || 0;
      const dailyTarget = targetAmount / daysInMonth;
      const todayAmount = todayMap.get(company.id) || 0;
      const monthTotal = monthMap.get(company.id) || 0;

      const percentage = dailyTarget > 0 ? (todayAmount / dailyTarget) * 100 : 0;
      const monthPercentage = targetAmount > 0 ? (monthTotal / targetAmount) * 100 : 0;

      return {
        company: { id: company.id, name: company.name, code: company.code },
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
    });

    return {
      year,
      month,
      date: today.toISOString().split('T')[0],
      companies: result,
    };
  }

  // === Trend === (Optimized: 2 queries instead of N+1)
  async getTrend(query: RevenueQueryDto) {
    const year = query.year || new Date().getFullYear();
    const month = query.month || new Date().getMonth() + 1;

    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));

    // Query 1: Get all companies
    const companies = await this.companyRepo.find({ where: { isActive: true } });

    // Query 2: Get all realizations for the month (batch)
    const allRealizations = await this.realizationRepo.find({
      where: { date: Between(startDate, endDate) },
      order: { date: 'ASC' },
    });

    // Group realizations by company
    const realizationsByCompany = new Map<number, typeof allRealizations>();
    allRealizations.forEach((r) => {
      if (!realizationsByCompany.has(r.companyId)) {
        realizationsByCompany.set(r.companyId, []);
      }
      realizationsByCompany.get(r.companyId)!.push(r);
    });

    // Build datasets without additional queries
    const datasets = companies.map((company) => {
      const realizations = realizationsByCompany.get(company.id) || [];
      const data = Array(daysInMonth).fill(0);
      
      realizations.forEach((r) => {
        const day = new Date(r.date).getDate() - 1;
        data[day] = Number(r.amount) / 1000000;
      });

      return {
        company: company.code,
        companyName: company.name,
        data,
      };
    });

    return {
      year,
      month,
      labels,
      datasets,
    };
  }

  // === Yearly Comparison === (Optimized: 3 queries instead of 73!)
  async getYearlyComparison(year?: number) {
    const targetYear = year || new Date().getFullYear();
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

    // Query 1: Get all companies
    const companies = await this.companyRepo.find({ where: { isActive: true } });

    // Query 2: Get all targets for the year (batch)
    const allTargets = await this.targetRepo.find({
      where: { year: targetYear },
    });
    
    // Create lookup map: companyId -> month -> amount
    const targetMap = new Map<number, Map<number, number>>();
    allTargets.forEach((t) => {
      if (!targetMap.has(t.companyId)) {
        targetMap.set(t.companyId, new Map());
      }
      targetMap.get(t.companyId)!.set(t.month, Number(t.targetAmount));
    });

    // Query 3: Get monthly totals using SQL aggregation
    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31);
    
    const monthlyTotals = await this.realizationRepo
      .createQueryBuilder('r')
      .select('r.company_id', 'companyId')
      .addSelect('MONTH(r.date)', 'month')
      .addSelect('SUM(r.amount)', 'total')
      .where('r.date >= :startOfYear', { startOfYear })
      .andWhere('r.date <= :endOfYear', { endOfYear })
      .groupBy('r.company_id')
      .addGroupBy('MONTH(r.date)')
      .getRawMany();

    // Create lookup map: companyId -> month -> total
    const realisasiMap = new Map<number, Map<number, number>>();
    monthlyTotals.forEach((m) => {
      if (!realisasiMap.has(m.companyId)) {
        realisasiMap.set(m.companyId, new Map());
      }
      realisasiMap.get(m.companyId)!.set(Number(m.month), Number(m.total));
    });

    // Build datasets without additional queries
    const datasets = companies.map((company) => {
      const companyTargets = targetMap.get(company.id) || new Map();
      const companyRealisasi = realisasiMap.get(company.id) || new Map();

      const targetData: number[] = [];
      const realisasiData: number[] = [];

      for (let month = 1; month <= 12; month++) {
        targetData.push((companyTargets.get(month) || 0) / 1000000);
        realisasiData.push((companyRealisasi.get(month) || 0) / 1000000);
      }

      return {
        company: company.code,
        companyName: company.name,
        target: targetData,
        realisasi: realisasiData,
      };
    });

    return {
      year: targetYear,
      labels,
      datasets,
    };
  }
}
