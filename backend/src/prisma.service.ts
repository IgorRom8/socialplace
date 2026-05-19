import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Без @prisma/adapter-pg: подключение и TLS обрабатывает движок Prisma по DATABASE_URL
 * (как при `prisma migrate deploy`). Adapter-pg через node-pg на Render давал 28000 SSL/TLS required.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
}
