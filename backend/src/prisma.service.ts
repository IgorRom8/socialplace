import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, type PoolConfig } from 'pg';

/**
 * Render / облачный Postgres часто требует TLS (ошибка 28000 «SSL/TLS required»).
 * Явно задаём ssl у Pool: только из query-параметров URL бывает недостаточно для adapter-pg.
 */
function createPoolConfig(connectionString: string): PoolConfig {
  const lower = connectionString.toLowerCase();
  if (
    process.env.DATABASE_SSL === 'false' ||
    lower.includes('sslmode=disable') ||
    lower.includes('ssl=false')
  ) {
    return { connectionString };
  }

  const onRender = process.env.RENDER === 'true';
  const likelyCloudHost =
    onRender ||
    connectionString.includes('.render.com') ||
    connectionString.includes('.neon.tech') ||
    connectionString.includes('.supabase.co');

  const forceSsl =
    process.env.PGSSLMODE === 'require' ||
    process.env.DATABASE_SSL === 'require';

  let isLoopback = false;
  try {
    const u = new URL(connectionString.replace(/^postgresql:/i, 'http:'));
    const h = u.hostname;
    isLoopback = h === 'localhost' || h === '127.0.0.1' || h === '::1';
  } catch {
    isLoopback = false;
  }

  const config: PoolConfig = { connectionString };

  if ((likelyCloudHost || forceSsl) && !isLoopback) {
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
