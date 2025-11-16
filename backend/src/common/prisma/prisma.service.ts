import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      // Log connection failure. Cloud Run startup will fail if DB isn't available,
      // but this log makes debugging logs easier in the Cloud console.
      // Re-throw to let the platform know startup failed.
      console.error('PrismaService: failed to connect to the database:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
