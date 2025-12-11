import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { CompanyEntity } from './company.entity';

@Entity('revenue_targets')
@Unique(['company', 'year', 'month'])
export class RevenueTargetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CompanyEntity, (company) => company.targets, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'company_id' })
  company: CompanyEntity;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column()
  year: number;

  @Column()
  month: number; // 1-12

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  targetAmount: number; // Target bulanan dalam Rupiah

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
