// /backend/src/stock/entities/transaction.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('transactions') // Nama tabel 'transactions'
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ length: 3 }) // 'IN' or 'OUT'
  type: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Relasi: Banyak Transaksi diinput oleh satu User
  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' }) // Nama kolom foreign key
  user: UserEntity;
}
