import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, type PoolConfig } from 'pg';

/**
 * Render / многие облачные Postgres требуют TLS. Через adapter-pg без ssl в Pool
 * возможна ошибка PostgreSQL 28000 «SSL/TLS required».
 */
function createPoolConfig(connectionString: string): PoolConfig {
  const lower = connectionString.toLowerCase();
  const urlRequestsSsl =
    lower.includes('sslmode=require') ||
    lower.includes('sslmode=verify-full') ||
    lower.includes('sslmode=no-verify') ||
    lower.includes('ssl=true');

  const likelyCloudHost =
    connectionString.includes('.render.com') ||
    connectionString.includes('.neon.tech') ||
    connectionString.includes('.supabase.co');

  const forceSsl = process.env.PGSSLMODE === 'require' ||
    process.env.DATABASE_SSL === 'require';

  const config: PoolConfig = { connectionString };

  if ((likelyCloudHost || forceSsl) && !urlRequestsSsl) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set');
    }

    const pool = new Pool(createPoolConfig(databaseUrl));
    super({ adapter: new PrismaPg(pool) });
    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
  }
}
