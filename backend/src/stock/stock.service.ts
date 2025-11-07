// /backend/src/stock/stock.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionEntity } from './entities/transaction.entity';
import { CreateStockInDto } from './dto/create-stock-in.dto';
import { CreateStockOutDto } from './dto/create-stock-out.dto';
import { StockHistoryQueryDto } from './dto/history-query.dto'; // <-- Impor DTO
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
    
    const summary = await this.transactionRepository
      .createQueryBuilder('tx') // 'tx' adalah alias untuk tabel 'transactions'
      .select(
        "SUM(CASE WHEN tx.type = 'IN' THEN tx.amount ELSE -tx.amount END)",
        'currentStock',
      )
      .addSelect(
        `SUM(
          CASE
            WHEN tx.type = 'OUT'
              AND DATE(timezone(:tz, tx.timestamp)) = DATE(timezone(:tz, CURRENT_TIMESTAMP))
            THEN tx.amount
            ELSE 0
          END
        )`,
        'todayUsage',
      )
      .addSelect(
        `SUM(
          CASE
            WHEN DATE(timezone(:tz, tx.timestamp)) < DATE(timezone(:tz, CURRENT_TIMESTAMP))
            THEN (CASE WHEN tx.type = 'IN' THEN tx.amount ELSE -tx.amount END)
            ELSE 0
          END
        )`,
        'todayInitialStock',
      )
      .setParameter('tz', this.reportTimezone)
      .getRawOne(); // .getRawOne() karena ini adalah query agregat

    // getRawOne() mengembalikan string. Kita ubah ke number (float).
    // Jika 'summary.currentStock' adalah null (tabel kosong), '|| 0' akan jadi default.
    return {
      currentStock: parseFloat(summary.currentStock) || 0,
      todayUsage: parseFloat(summary.todayUsage) || 0,
      todayInitialStock: parseFloat(summary.todayInitialStock) || 0,
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

    const newTransaction = this.transactionRepository.create({
      type: 'IN',
      amount: createStockInDto.amount,
      description: createStockInDto.description,
      user: { id: user.id }, // Relasi ke user yang menginput
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

    const newTransaction = this.transactionRepository.create({
      type: 'OUT',
      amount: createStockOutDto.amount,
      description: createStockOutDto.description,
      user: { id: user.id }, // Relasi ke user yang menginput
    });

    return this.transactionRepository.save(newTransaction);
  }

  async getHistory(
    historyQueryDto: StockHistoryQueryDto,
    user: AuthenticatedUser,
  ) {
    const { page = 1, limit = 10, type, startDate, endDate } = historyQueryDto;
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
}
