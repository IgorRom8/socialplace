import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import type { PoolConfig } from 'pg';

/**
 * Prisma 7 требует driver adapter. Конфиг как в документации PrismaPg:
 * объект с `connectionString` (не сырой URL в первом аргументе без опций).
 * Для Render Postgres нужен TLS — задаём `ssl` в том же объекте (иначе 28000).
 */
function createPgPoolConfig(connectionString: string): PoolConfig {
  const lower = connectionString.toLowerCase();
  if (
    process.env.DATABASE_SSL === 'false' ||
    lower.includes('sslmode=disable') ||
    lower.includes('ssl=false')
  ) {
    return { connectionString };
  }

  const cloud =
    process.env.RENDER === 'true' ||
    connectionString.includes('.render.com') ||
    connectionString.includes('.neon.tech') ||
    connectionString.includes('.supabase.co');

  const forceSsl =
    process.env.PGSSLMODE === 'require' ||
    process.env.DATABASE_SSL === 'require';

  let loopback = false;
  try {
    const u = new URL(connectionString.replace(/^postgresql:/i, 'http:'));
    loopback = ['localhost', '127.0.0.1', '::1'].includes(u.hostname);
  } catch {
    loopback = false;
  }

  const cfg: PoolConfig = { connectionString };

  if ((cloud || forceSsl) && !loopback) {
    cfg.ssl = { rejectUnauthorized: false };
  }

  return cfg;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set');
    }

    super({
      adapter: new PrismaPg(createPgPoolConfig(databaseUrl)),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
}
