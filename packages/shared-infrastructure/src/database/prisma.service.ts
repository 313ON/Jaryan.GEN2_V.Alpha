import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPostgresAdapter } from '@prisma/adapter-ppg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = process.env['PRISMA_DIRECT_TCP_URL'];

    if (!connectionString) {
      throw new Error('PRISMA_DIRECT_TCP_URL must be set for the Prisma Postgres runtime adapter.');
    }

    super({
      adapter: new PrismaPostgresAdapter({ connectionString }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
