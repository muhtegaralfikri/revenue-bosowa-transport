// /backend/src/users/users.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common'; 
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { RoleEntity } from './entities/role.entity';

@Injectable()
// Tambahkan 'implements OnModuleInit'
export class UsersService implements OnModuleInit { 
  // Tambahkan Logger untuk pesan yang rapi di konsol
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private rolesRepository: Repository<RoleEntity>,
  ) {}

  /**
   * Method ini akan dipanggil otomatis oleh NestJS
   * saat UsersModule diinisialisasi.
   */
  async onModuleInit() {
    await this.seedInitialData();
  }

  /**
   * Logic untuk membuat data awal (Roles dan Admin User)
   * Ini 'idempotent', artinya aman dijalankan berkali-kali.
   */
  private async seedInitialData() {
    try {
      // 1. Buat Roles jika belum ada
      let adminRole = await this.rolesRepository.findOne({ where: { name: 'admin' } });
      if (!adminRole) {
        adminRole = this.rolesRepository.create({ name: 'admin' });
        await this.rolesRepository.save(adminRole);
        this.logger.log('Admin role created');
      }

      let opRole = await this.rolesRepository.findOne({ where: { name: 'operasional' } });
      if (!opRole) {
        opRole = this.rolesRepository.create({ name: 'operasional' });
        await this.rolesRepository.save(opRole);
        this.logger.log('Operasional role created');
      }

      // 2. Buat Admin User jika belum ada
      const adminEmail = 'admin@example.com'; // <-- Ganti jika perlu
      const adminUser = await this.usersRepository.findOne({ where: { email: adminEmail } });

      if (!adminUser) {
        const newAdmin = this.usersRepository.create({
          username: 'Admin Bosowa',
          email: adminEmail,
          password: 'password123', // <-- Ganti ini dengan password yang kuat
          role: adminRole, // Assign role admin
        });
        
        // Ingat: Entity 'user.entity.ts' kita punya hook @BeforeInsert
        // yang akan otomatis HASH password 'password123' ini sebelum disimpan.
        await this.usersRepository.save(newAdmin);
        this.logger.log('Admin user created successfully');
      }
      // 3. TAMBAHKAN INI: Buat Operasional User jika belum ada
      const opEmail = 'op@example.com'; // <-- Ganti jika perlu
      const opUser = await this.usersRepository.findOne({ where: { email: opEmail } });

      if (!opUser) {
        const newOp = this.usersRepository.create({
          username: 'Operasional Lapangan',
          email: opEmail,
          password: 'password123', // <-- Nanti ganti
          role: opRole, // Assign role operasional
        });
        await this.usersRepository.save(newOp);
        this.logger.log('Operasional user created successfully'); // <-- Pesan log baru
      }
    } catch (error) {
      this.logger.error('Failed to seed initial data', error);
    }
  }
  /**
   * Method baru untuk mencari user berdasarkan username
   * Kita pakai 'relations' untuk otomatis mengambil data 'role'
   */
  async findOneByUsername(username: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: { username },
      relations: ['role'], // Ini akan join tabel 'roles'
    });
  }

  async findOneByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['role'], // Tetap ambil role-nya
    });
  }
  async findOneById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['role'], // Kita juga ambil role-nya
    });
  }
}