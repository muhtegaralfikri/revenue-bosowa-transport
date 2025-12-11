import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveRoles1765400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint from users table
    await queryRunner.query(`ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_a2cecd1a3531c0b041e29ba46e1\``);
    
    // Drop role_id column from users
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`role_id\``);
    
    // Drop roles table
    await queryRunner.query(`DROP TABLE \`roles\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate roles table
    await queryRunner.query(`
      CREATE TABLE \`roles\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(50) NOT NULL,
        UNIQUE INDEX \`IDX_648e3f5447f725579d7d4ffdfb\` (\`name\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    
    // Add role_id column back to users
    await queryRunner.query(`ALTER TABLE \`users\` ADD \`role_id\` int NULL`);
    
    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE \`users\` ADD CONSTRAINT \`FK_a2cecd1a3531c0b041e29ba46e1\` 
      FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }
}
