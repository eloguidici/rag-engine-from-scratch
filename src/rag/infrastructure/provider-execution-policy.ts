import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Executes provider calls with bounded time and exponential retry for transient failures. */
@Injectable()
export class ProviderExecutionPolicy {
  constructor(private readonly config: ConfigService) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const timeoutMs = Number(this.config.get('PROVIDER_TIMEOUT_MS') ?? 30_000);
    const maxRetries = Number(this.config.get('PROVIDER_MAX_RETRIES') ?? 2);
    const baseDelayMs = Number(this.config.get('PROVIDER_RETRY_BASE_MS') ?? 250);

    let attempt = 0;
    while (true) {
      try {
        return await this.withTimeout(operation(), timeoutMs);
      } catch (error) {
        if (attempt >= maxRetries || !this.isRetryable(error)) throw error;
        await this.delay(baseDelayMs * 2 ** attempt);
        attempt += 1;
      }
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`Provider request timed out after ${timeoutMs}ms`)),
            timeoutMs,
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof Error && error.message.startsWith('Provider request timed out')) {
      return true;
    }

    if (typeof error !== 'object' || error === null || !('status' in error)) {
      return true;
    }

    const status = Number((error as { status?: unknown }).status);
    return status === 408 || status === 409 || status === 429 || status >= 500;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
