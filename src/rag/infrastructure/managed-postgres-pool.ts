import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class ManagedPostgresPool extends Pool implements OnApplicationShutdown {
  constructor(config: ConfigService) {
    super({
      connectionString: config.get<string>('DATABASE_URL'),
      max: Number(config.get('POSTGRES_POOL_MAX') ?? 10),
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.end();
  }
}
