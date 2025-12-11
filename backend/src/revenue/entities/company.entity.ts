import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { RevenueTargetEntity } from './revenue-target.entity';
import { RevenueRealizationEntity } from './revenue-realization.entity';

@Entity('companies')
export class CompanyEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ length: 20, unique: true })
  code: string; // BBI, BBA, JPI

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => RevenueTargetEntity, (target) => target.company)
  targets: RevenueTargetEntity[];

  @OneToMany(() => RevenueRealizationEntity, (realization) => realization.company)
  realizations: RevenueRealizationEntity[];
}
