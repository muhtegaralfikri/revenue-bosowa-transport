// /backend/src/users/entities/role.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('roles') // Nama tabel di database
export class RoleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  name: string; // 'admin' atau 'operasional'
}