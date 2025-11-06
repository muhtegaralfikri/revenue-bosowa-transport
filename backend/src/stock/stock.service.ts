// /backend/src/stock/stock.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionEntity } from './entities/transaction.entity';
import { CreateStockInDto } from './dto/create-stock-in.dto';
import { CreateStockOutDto } from './dto/create-stock-out.dto';
import { PaginationDto } from '../common/dto/pagination.dto'; // <-- Impor DTO
// Tipe data 'user' yang disisipkan oleh JwtStrategy
interface AuthenticatedUser {
  id: string;
  username: string;
  role: string;
}

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(TransactionEntity)
    private transactionRepository: Repository<TransactionEntity>,
  ) {}

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
        "SUM(CASE WHEN tx.type = 'OUT' AND DATE(tx.timestamp) = CURRENT_DATE THEN tx.amount ELSE 0 END)",
        'todayUsage',
      )
      .addSelect(
        "SUM(CASE WHEN DATE(tx.timestamp) < CURRENT_DATE THEN (CASE WHEN tx.type = 'IN' THEN tx.amount ELSE -tx.amount END) ELSE 0 END)",
        'todayInitialStock',
      )
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

  async getHistory(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit; // Kalkulasi 'offset'

    // Kita pakai findAndCount untuk mendapatkan data + total data (untuk pagination)
    const [transactions, total] =
      await this.transactionRepository.findAndCount({
        relations: ['user'], // Join dengan tabel 'user'
        order: {
          timestamp: 'DESC', // Urutkan dari yang terbaru
        },
        take: limit, // Ambil 'limit' data
        skip: skip, // Lewati 'skip' data
      });

    // Kita format sedikit datanya agar tidak mengekspos password user
    const formattedData = transactions.map((tx) => ({
      id: tx.id,
      timestamp: tx.timestamp,
      type: tx.type,
      amount: tx.amount,
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