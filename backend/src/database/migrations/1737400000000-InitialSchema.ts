import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class InitialSchema1737400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.options.type === 'postgres') {
      await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    }

    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: this.uuidType(queryRunner),
            isPrimary: true,
            default: this.uuidDefault(queryRunner),
          },
          {
            name: 'username',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'password',
            type: 'varchar',
          },
          {
            name: 'role_id',
            type: 'int',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'users',
      new TableForeignKey({
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'transactions',
        columns: [
          {
            name: 'id',
            type: this.uuidType(queryRunner),
            isPrimary: true,
            default: this.uuidDefault(queryRunner),
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '3',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'user_id',
            type: this.uuidType(queryRunner),
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'transactions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'refresh_tokens',
        columns: [
          {
            name: 'id',
            type: this.uuidType(queryRunner),
            isPrimary: true,
            default: this.uuidDefault(queryRunner),
          },
          {
            name: 'token_hash',
            type: 'text',
          },
          {
            name: 'expires_at',
            type: 'timestamp',
          },
          {
            name: 'revoked_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'user_id',
            type: this.uuidType(queryRunner),
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'refresh_tokens',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('refresh_tokens', true);
    await queryRunner.dropTable('transactions', true);
    await queryRunner.dropTable('users', true);
    await queryRunner.dropTable('roles', true);
  }

  private uuidType(queryRunner: QueryRunner): string {
    const driver = queryRunner.connection.options.type;
    if (driver === 'postgres') {
      return 'uuid';
    }
    return 'varchar(36)';
  }

  private uuidDefault(queryRunner: QueryRunner): string | undefined {
    const driver = queryRunner.connection.options.type;
    if (driver === 'postgres') {
      return 'uuid_generate_v4()';
    }
    if (driver === 'mariadb') {
      return 'UUID()';
    }
    // MySQL 5.7 doesn't support UUID() as default, generate in application
    return undefined;
  }
}
