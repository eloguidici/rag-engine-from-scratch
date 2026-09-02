import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './common/health/health.controller';
import { validateEnvironment } from './config/environment';
import { RagModule } from './rag/rag.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    RagModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
