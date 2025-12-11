import { MigrationInterface, QueryRunner } from "typeorm";

export class RevenueEntities1765353832837 implements MigrationInterface {
    name = 'RevenueEntities1765353832837'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_a2cecd1a3531c0b041e29ba46e1\``);
        await queryRunner.query(`ALTER TABLE \`transactions\` DROP FOREIGN KEY \`FK_e9acc6efa76de013e8c1553ed2b\``);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` DROP FOREIGN KEY \`FK_3ddc983c5f7bcf132fd8732c3f4\``);
        await queryRunner.query(`DROP INDEX \`UQ_648e3f5447f725579d7d4ffdfb7\` ON \`roles\``);
        await queryRunner.query(`DROP INDEX \`UQ_fe0bb3f6520ee0469504521e710\` ON \`users\``);
        await queryRunner.query(`DROP INDEX \`UQ_97672ac88f789774dd47f7c8be3\` ON \`users\``);
        await queryRunner.query(`CREATE TABLE \`revenue_realizations\` (\`id\` uuid NOT NULL, \`company_id\` int NOT NULL, \`date\` date NOT NULL, \`amount\` decimal(15,2) NOT NULL, \`description\` text NULL, \`user_id\` uuid NULL, \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP(), \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP, UNIQUE INDEX \`IDX_6bfe65d4d794bd7249a7e74534\` (\`company_id\`, \`date\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`companies\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(100) NOT NULL, \`code\` varchar(20) NOT NULL, \`isActive\` tinyint NOT NULL DEFAULT 1, UNIQUE INDEX \`IDX_3dacbb3eb4f095e29372ff8e13\` (\`name\`), UNIQUE INDEX \`IDX_80af3e6808151c3210b4d5a218\` (\`code\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`revenue_targets\` (\`id\` uuid NOT NULL, \`company_id\` int NOT NULL, \`year\` int NOT NULL, \`month\` int NOT NULL, \`targetAmount\` decimal(15,2) NOT NULL, \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP(), \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP, UNIQUE INDEX \`IDX_ee493813bbeaf8c9f488e288cc\` (\`company_id\`, \`year\`, \`month\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`roles\` ADD UNIQUE INDEX \`IDX_648e3f5447f725579d7d4ffdfb\` (\`name\`)`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`id\` \`id\` uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD UNIQUE INDEX \`IDX_fe0bb3f6520ee0469504521e71\` (\`username\`)`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`)`);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`role_id\` \`role_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`transactions\` CHANGE \`id\` \`id\` uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`transactions\` CHANGE \`user_id\` \`user_id\` uuid NULL`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` CHANGE \`id\` \`id\` uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` DROP COLUMN \`token_hash\``);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` ADD \`token_hash\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` CHANGE \`user_id\` \`user_id\` uuid NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD CONSTRAINT \`FK_a2cecd1a3531c0b041e29ba46e1\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`transactions\` ADD CONSTRAINT \`FK_e9acc6efa76de013e8c1553ed2b\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`revenue_realizations\` ADD CONSTRAINT \`FK_a2db75d4e5a2161873f6675b062\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`revenue_realizations\` ADD CONSTRAINT \`FK_cd4c826c51e7085633c8b74e035\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`revenue_targets\` ADD CONSTRAINT \`FK_3be0398f152a079676c1f2ed204\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` ADD CONSTRAINT \`FK_3ddc983c5f7bcf132fd8732c3f4\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` DROP FOREIGN KEY \`FK_3ddc983c5f7bcf132fd8732c3f4\``);
        await queryRunner.query(`ALTER TABLE \`revenue_targets\` DROP FOREIGN KEY \`FK_3be0398f152a079676c1f2ed204\``);
        await queryRunner.query(`ALTER TABLE \`revenue_realizations\` DROP FOREIGN KEY \`FK_cd4c826c51e7085633c8b74e035\``);
        await queryRunner.query(`ALTER TABLE \`revenue_realizations\` DROP FOREIGN KEY \`FK_a2db75d4e5a2161873f6675b062\``);
        await queryRunner.query(`ALTER TABLE \`transactions\` DROP FOREIGN KEY \`FK_e9acc6efa76de013e8c1553ed2b\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_a2cecd1a3531c0b041e29ba46e1\``);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` CHANGE \`user_id\` \`user_id\` uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` ADD \`created_at\` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP()`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` DROP COLUMN \`token_hash\``);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` ADD \`token_hash\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` CHANGE \`id\` \`id\` uuid NOT NULL DEFAULT uuid()`);
        await queryRunner.query(`ALTER TABLE \`transactions\` CHANGE \`user_id\` \`user_id\` uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`transactions\` CHANGE \`id\` \`id\` uuid NOT NULL DEFAULT uuid()`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`role_id\` \`role_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`users\` ADD \`created_at\` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP()`);
        await queryRunner.query(`ALTER TABLE \`users\` DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP INDEX \`IDX_fe0bb3f6520ee0469504521e71\``);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`id\` \`id\` uuid NOT NULL DEFAULT uuid()`);
        await queryRunner.query(`ALTER TABLE \`roles\` DROP INDEX \`IDX_648e3f5447f725579d7d4ffdfb\``);
        await queryRunner.query(`DROP INDEX \`IDX_ee493813bbeaf8c9f488e288cc\` ON \`revenue_targets\``);
        await queryRunner.query(`DROP TABLE \`revenue_targets\``);
        await queryRunner.query(`DROP INDEX \`IDX_80af3e6808151c3210b4d5a218\` ON \`companies\``);
        await queryRunner.query(`DROP INDEX \`IDX_3dacbb3eb4f095e29372ff8e13\` ON \`companies\``);
        await queryRunner.query(`DROP TABLE \`companies\``);
        await queryRunner.query(`DROP INDEX \`IDX_6bfe65d4d794bd7249a7e74534\` ON \`revenue_realizations\``);
        await queryRunner.query(`DROP TABLE \`revenue_realizations\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`UQ_97672ac88f789774dd47f7c8be3\` ON \`users\` (\`email\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`UQ_fe0bb3f6520ee0469504521e710\` ON \`users\` (\`username\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`UQ_648e3f5447f725579d7d4ffdfb7\` ON \`roles\` (\`name\`)`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` ADD CONSTRAINT \`FK_3ddc983c5f7bcf132fd8732c3f4\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`transactions\` ADD CONSTRAINT \`FK_e9acc6efa76de013e8c1553ed2b\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD CONSTRAINT \`FK_a2cecd1a3531c0b041e29ba46e1\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT`);
    }

}
