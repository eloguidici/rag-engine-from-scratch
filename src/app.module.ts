import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './common/health/health.controller';
import { RagModule } from './rag/rag.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), RagModule],
  controllers: [HealthController],
})
export class AppModule {}
