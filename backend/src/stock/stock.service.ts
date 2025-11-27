// /backend/src/stock/stock.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { TransactionEntity } from './entities/transaction.entity';
import { CreateStockInDto } from './dto/create-stock-in.dto';
import { CreateStockOutDto } from './dto/create-stock-out.dto';
import { StockHistoryQueryDto } from './dto/history-query.dto'; // <-- Impor DTO
import { StockTrendQueryDto } from './dto/trend-query.dto';
import { StockTrendPointDto, StockTrendResponseDto } from './dto/trend-response.dto';
import { DailyInOutTrendDto } from './dto/inout-trend.dto';
// Tipe data 'user' yang disisipkan oleh JwtStrategy
interface AuthenticatedUser {
  id: string;
  username: string;
  role: string;
}

@Injectable()
export class StockService {
  private readonly reportTimezone: string;

  constructor(
    @InjectRepository(TransactionEntity)
    private transactionRepository: Repository<TransactionEntity>,
    private readonly configService: ConfigService,
  ) {
    this.reportTimezone =
      this.configService.get<string>('APP_TIMEZONE') ?? 'Asia/Makassar';
  }

  /**
   * Endpoint 1: Mengambil 3 data untuk kartu di Beranda.
   * Ini adalah query paling kompleks, kita pakai QueryBuilder.
   */
  async getSummary() {
    // Kita butuh 3 query:
    // 1. currentStock: (SUM SEMUA 'IN') - (SUM SEMUA 'OUT')
    // 2. todayUsage: (SUM 'OUT' HARI INI)
    // 3. todayInitialStock: (currentStock) - (SUM 'IN' HARI INI) + (SUM 'OUT' HARI INI)
    //    ...atau lebih efisien: (SUM 'IN' SEBELUM HARI INI) - (SUM 'OUT' SEBELUM HARI INI)
    
    const dbType =
      this.transactionRepository.manager.connection.options.type;
    const useTimezoneFn = dbType === 'postgres';
    const txDateExpr = useTimezoneFn
      ? 'DATE(timezone(:tz, tx.timestamp))'
      : 'DATE(tx.timestamp)';
    const currentDateExpr = useTimezoneFn
      ? 'DATE(timezone(:tz, CURRENT_TIMESTAMP))'
      : 'CURRENT_DATE';

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('tx') // 'tx' adalah alias untuk tabel 'transactions'
      .select(
        "SUM(CASE WHEN tx.type = 'IN' THEN tx.amount ELSE -tx.amount END)",
        'currentStock',
      )
      .addSelect(
        `SUM(
          CASE
            WHEN tx.type = 'IN'
              AND ${txDateExpr} = ${currentDateExpr}
            THEN tx.amount
            ELSE 0
          END
        )`,
        'todayStockIn',
      )
      .addSelect(
        `SUM(
          CASE
            WHEN tx.type = 'OUT'
              AND ${txDateExpr} = ${currentDateExpr}
            THEN tx.amount
            ELSE 0
          END
        )`,
        'todayStockOut',
      )
      .addSelect(
        `SUM(
          CASE
            WHEN ${txDateExpr} < ${currentDateExpr}
            THEN (CASE WHEN tx.type = 'IN' THEN tx.amount ELSE -tx.amount END)
            ELSE 0
          END
        )`,
        'todayInitialStock',
      );

    if (useTimezoneFn) {
      queryBuilder.setParameter('tz', this.reportTimezone);
    }

    const summary = await queryBuilder.getRawOne(); // .getRawOne() karena ini adalah query agregat

    // getRawOne() mengembalikan string. Kita ubah ke number (float).
    // Jika 'summary.currentStock' adalah null (tabel kosong), '|| 0' akan jadi default.
    const currentStock = parseFloat(summary.currentStock) || 0;
    const todayInitialStock = parseFloat(summary.todayInitialStock) || 0;
    const todayStockIn = parseFloat(summary.todayStockIn) || 0;
    const todayStockOut = parseFloat(summary.todayStockOut) || 0;
    const todayClosingStock = todayInitialStock + todayStockIn - todayStockOut;

    return {
      currentStock,
      todayUsage: todayStockOut,
      todayInitialStock,
      todayStockIn,
      todayStockOut,
      todayClosingStock,
    };
  }

  /**
   * Endpoint 2: Menambah stok (Hanya Admin)
   */
  async addStockIn(
    createStockInDto: CreateStockInDto,
    user: AuthenticatedUser,
  ) {
    // Kita cek dulu, untuk jaga-jaga, jangan sampai amount-nya negatif
    if (createStockInDto.amount <= 0) {
      throw new BadRequestException('Jumlah harus lebih dari 0');
    }

    let stockInTimestamp: Date | undefined;
    if (createStockInDto.timestamp) {
      stockInTimestamp = new Date(createStockInDto.timestamp);
      if (Number.isNaN(stockInTimestamp.getTime())) {
        throw new BadRequestException('Tanggal penambahan tidak valid.');
      }
    }

    const newTransaction = this.transactionRepository.create({
      type: 'IN',
      amount: createStockInDto.amount,
      description: createStockInDto.description,
      user: { id: user.id }, // Relasi ke user yang menginput
      ...(stockInTimestamp ? { timestamp: stockInTimestamp } : {}),
    });

    return this.transactionRepository.save(newTransaction);
  }

  /**
   * Endpoint 3: Menggunakan stok (Hanya Operasional)
   */
  async useStockOut(
    createStockOutDto: CreateStockOutDto,
    user: AuthenticatedUser,
  ) {
    // Business Logic Kritis: Cek ketersediaan stok
    const { currentStock } = await this.getSummary();
    if (currentStock < createStockOutDto.amount) {
      throw new BadRequestException(
        `Stok tidak mencukupi. Sisa stok: ${currentStock} liter.`,
      );
    }

    if (createStockOutDto.amount <= 0) {
      throw new BadRequestException('Jumlah harus lebih dari 0');
    }

    let usageTimestamp: Date | undefined;
    if (createStockOutDto.timestamp) {
      usageTimestamp = new Date(createStockOutDto.timestamp);
      if (Number.isNaN(usageTimestamp.getTime())) {
        throw new BadRequestException('Tanggal pemakaian tidak valid.');
      }
    }

    const transactionPayload: DeepPartial<TransactionEntity> = {
      type: 'OUT',
      amount: createStockOutDto.amount,
      description: createStockOutDto.description,
      user: { id: user.id }, // Relasi ke user yang menginput
    };

    if (usageTimestamp) {
      transactionPayload.timestamp = usageTimestamp;
    }

    const newTransaction = this.transactionRepository.create(
      transactionPayload,
    );

    return this.transactionRepository.save(newTransaction);
  }

  async getHistory(
    historyQueryDto: StockHistoryQueryDto,
    user: AuthenticatedUser,
  ) {
    const { page = 1, limit = 10, type, startDate, endDate, userId, q } = historyQueryDto;
    const skip = (page - 1) * limit; // Kalkulasi 'offset'

    const enforcedType = user.role === 'operasional' ? 'OUT' : type;

    const qb = this.transactionRepository
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.user', 'user')
      .orderBy('tx.timestamp', 'DESC')
      .skip(skip)
      .take(limit);

    if (enforcedType) {
      qb.andWhere('tx.type = :type', { type: enforcedType });
    }

    if (userId && user.role === 'admin') {
      qb.andWhere('user.id = :userId', { userId });
    }

    if (q) {
      qb.andWhere(
        '(LOWER(tx.description) LIKE :search OR LOWER(user.username) LIKE :search)',
        { search: `%${q.toLowerCase()}%` },
      );
    }

    const parsedStart = startDate ? new Date(startDate) : null;
    const parsedEnd = endDate ? new Date(endDate) : null;

    if (parsedStart && parsedEnd && parsedStart > parsedEnd) {
      throw new BadRequestException('startDate tidak boleh melebihi endDate.');
    }

    if (parsedStart) {
      qb.andWhere('tx.timestamp >= :startDate', {
        startDate: parsedStart.toISOString(),
      });
    }

    if (parsedEnd) {
      qb.andWhere('tx.timestamp <= :endDate', {
        endDate: parsedEnd.toISOString(),
      });
    }

    const [transactions, total] = await qb.getManyAndCount();

    // Kita format sedikit datanya agar tidak mengekspos password user
    const formattedData = transactions.map((tx) => ({
      id: tx.id,
      timestamp: tx.timestamp,
      type: tx.type,
      amount: Number(tx.amount),
      description: tx.description,
      user: {
        id: tx.user.id,
        username: tx.user.username,
        email: tx.user.email,
      },
    }));

    return {
      data: formattedData,
      meta: {
        totalItems: total,
        itemCount: transactions.length,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDailyStockTrend(trendQueryDto: StockTrendQueryDto): Promise<StockTrendResponseDto> {
    const { window, rangeStart, rangeEndExclusive, todayStart } =
      this.getWindowParams(trendQueryDto);

    const totalBeforeRow = await this.transactionRepository
      .createQueryBuilder('tx')
      .select(
        "COALESCE(SUM(CASE WHEN tx.type = 'IN' THEN tx.amount ELSE -tx.amount END), 0)",
        'total',
      )
      .where('tx.timestamp < :rangeStart', {
        rangeStart: rangeStart.toISOString(),
      })
      .getRawOne();

    const startingStock = parseFloat(totalBeforeRow?.total) || 0;

    const transactions = await this.transactionRepository
      .createQueryBuilder('tx')
      .select(['tx.timestamp', 'tx.type', 'tx.amount'])
      .where('tx.timestamp >= :rangeStart AND tx.timestamp < :rangeEnd', {
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEndExclusive.toISOString(),
      })
      .orderBy('tx.timestamp', 'ASC')
      .getMany();

    const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.reportTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const labelFormatter = new Intl.DateTimeFormat('id-ID', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: this.reportTimezone,
    });

    const dailyDeltas = new Map<string, number>();
    transactions.forEach((tx) => {
      const key = dateKeyFormatter.format(tx.timestamp);
      const delta = tx.type === 'IN' ? Number(tx.amount) : -Number(tx.amount);
      dailyDeltas.set(key, (dailyDeltas.get(key) ?? 0) + delta);
    });

    const points: StockTrendPointDto[] = [];
    let runningStock = startingStock;

    for (let i = 0; i < window; i += 1) {
      const dayStart = this.addDays(rangeStart, i);
      const key = dateKeyFormatter.format(dayStart);
      const delta = dailyDeltas.get(key) ?? 0;
      const openingStock = runningStock;
      runningStock += delta;
      points.push({
        date: key,
        label: labelFormatter.format(dayStart),
        openingStock,
        closingStock: runningStock,
        delta,
      });
    }

    return {
      timezone: this.reportTimezone,
      startDate: rangeStart.toISOString(),
      endDate: rangeEndExclusive.toISOString(),
      days: window,
      points,
    };
  }

  async getDailyInOutTrend(
    trendQueryDto: StockTrendQueryDto,
  ): Promise<DailyInOutTrendDto> {
    const { window, rangeStart, rangeEndExclusive } =
      this.getWindowParams(trendQueryDto);

    const transactions = await this.transactionRepository
      .createQueryBuilder('tx')
      .select(['tx.timestamp', 'tx.type', 'tx.amount'])
      .where('tx.timestamp >= :rangeStart AND tx.timestamp < :rangeEnd', {
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEndExclusive.toISOString(),
      })
      .orderBy('tx.timestamp', 'ASC')
      .getMany();

    const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.reportTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const labelFormatter = new Intl.DateTimeFormat('id-ID', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: this.reportTimezone,
    });

    const aggregates = new Map<string, { in: number; out: number }>();

    transactions.forEach((tx) => {
      const key = dateKeyFormatter.format(tx.timestamp);
      const bucket = aggregates.get(key) ?? { in: 0, out: 0 };
      if (tx.type === 'IN') {
        bucket.in += Number(tx.amount);
      } else {
        bucket.out += Number(tx.amount);
      }
      aggregates.set(key, bucket);
    });

    const points: DailyInOutTrendDto['points'] = [];
    for (let i = 0; i < window; i += 1) {
      const dayStart = this.addDays(rangeStart, i);
      const key = dateKeyFormatter.format(dayStart);
      const agg = aggregates.get(key) ?? { in: 0, out: 0 };
      points.push({
        date: key,
        label: labelFormatter.format(dayStart),
        totalIn: agg.in,
        totalOut: agg.out,
      });
    }

    return {
      timezone: this.reportTimezone,
      startDate: rangeStart.toISOString(),
      endDate: rangeEndExclusive.toISOString(),
      days: window,
      points,
    };
  }

  private getWindowParams(trendQueryDto: StockTrendQueryDto) {
    const window = Math.min(Math.max(trendQueryDto?.days ?? 7, 1), 30);
    const todayStart = this.getTimezoneStartOfDay(new Date());
    const rangeStart = this.addDays(todayStart, -(window - 1));
    const rangeEndExclusive = this.addDays(todayStart, 1);
    return { window, todayStart, rangeStart, rangeEndExclusive };
  }

  private getTimezoneStartOfDay(date: Date) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: this.reportTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = Number(parts.find((p) => p.type === 'year')?.value);
    const month = Number(parts.find((p) => p.type === 'month')?.value);
    const day = Number(parts.find((p) => p.type === 'day')?.value);
    return new Date(Date.UTC(year, month - 1, day));
  }

  private addDays(date: Date, amount: number) {
    const clone = new Date(date);
    clone.setUTCDate(clone.getUTCDate() + amount);
    return clone;
  }
}
