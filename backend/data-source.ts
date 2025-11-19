import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

const runtimeEnv = process.env.NODE_ENV ?? 'development';
const envFiles = [`.env.${runtimeEnv}`, '.env'];

envFiles.forEach((file) => {
  const filePath = join(__dirname, file);
  if (existsSync(filePath)) {
    loadEnv({ path: filePath });
  }
});

const type = (process.env.DB_TYPE || 'postgres').toLowerCase();
const logging = process.env.DB_LOGGING === 'true';
const synchronize = process.env.DB_SYNCHRONIZE === 'true';

const common: Pick<DataSourceOptions, 'entities' | 'migrations' | 'logging' | 'synchronize'> = {
  entities: [join(__dirname, 'src/**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'src/database/migrations/*{.ts,.js}')],
  logging,
  synchronize,
};

let dataSourceOptions: DataSourceOptions;

if (type === 'mysql') {
  dataSourceOptions = {
    ...common,
    type: 'mysql',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fuel_ledger',
  };
} else {
  const useSsl = process.env.DB_SSL === 'true';
  const basePostgres: DataSourceOptions = {
    ...common,
    type: 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'fuel_ledger',
  };
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    dataSourceOptions = {
      ...common,
      type: 'postgres',
      url: databaseUrl,
      ...(useSsl
        ? {
            ssl: {
              rejectUnauthorized: false,
            },
          }
        : {}),
    };
  } else {
    dataSourceOptions = {
      ...basePostgres,
      ...(useSsl
        ? {
            ssl: {
              rejectUnauthorized: false,
            },
          }
        : {}),
    };
  }
}

export const AppDataSource = new DataSource(dataSourceOptions);
