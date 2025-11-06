// /backend/src/users/entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { RoleEntity } from './role.entity';
import * as bcrypt from 'bcrypt';

@Entity('users') // Nama tabel 'users'
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  username: string;

  @Column()
  password: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relasi: Banyak User punya satu Role
  @ManyToOne(() => RoleEntity, { eager: true }) // eager: true = otomatis load role saat query user
  @JoinColumn({ name: 'role_id' }) // Nama kolom foreign key di DB
  role: RoleEntity;

  // Hook: Otomatis hash password sebelum di-INSERT
  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }
}