import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { CompanyEntity } from './company.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('revenue_realizations')
@Unique(['company', 'date'])
export class RevenueRealizationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CompanyEntity, (company) => company.realizations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'company_id' })
  company: CompanyEntity;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number; // Realisasi harian dalam Rupiah

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
