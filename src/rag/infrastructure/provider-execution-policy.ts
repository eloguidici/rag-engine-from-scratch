import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Executes provider calls with timeout, retry, rate-limit backoff and a small circuit breaker. */
@Injectable()
export class ProviderExecutionPolicy {
  private consecutiveFailures = 0;
  private circuitOpenedAt?: number;

  constructor(private readonly config: ConfigService) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.assertCircuitAvailable();

    const timeoutMs = Number(this.config.get('PROVIDER_TIMEOUT_MS') ?? 30_000);
    const maxRetries = Number(this.config.get('PROVIDER_MAX_RETRIES') ?? 2);
    const baseDelayMs = Number(this.config.get('PROVIDER_RETRY_BASE_MS') ?? 250);

    let attempt = 0;
    while (true) {
      try {
        const result = await this.withTimeout(operation(), timeoutMs);
        this.resetCircuit();
        return result;
      } catch (error) {
        const retryable = this.isRetryable(error);
        if (!retryable) {
          this.registerFailure();
          throw error;
        }

        if (attempt >= maxRetries) {
          this.registerFailure();
          throw error;
        }

        const retryDelay = this.retryAfterMs(error) ?? baseDelayMs * 2 ** attempt;
        await this.delay(retryDelay);
        attempt += 1;
      }
    }
  }

  private assertCircuitAvailable(): void {
    if (this.circuitOpenedAt === undefined) return;

    const resetMs = Number(this.config.get('PROVIDER_CIRCUIT_RESET_MS') ?? 30_000);
    if (Date.now() - this.circuitOpenedAt >= resetMs) {
      this.resetCircuit();
      return;
    }

    throw new Error('Provider circuit is open');
  }

  private registerFailure(): void {
    const threshold = Number(this.config.get('PROVIDER_CIRCUIT_FAILURE_THRESHOLD') ?? 5);
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= threshold) {
      this.circuitOpenedAt = Date.now();
    }
  }

  private resetCircuit(): void {
    this.consecutiveFailures = 0;
    this.circuitOpenedAt = undefined;
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

  private retryAfterMs(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null || !('headers' in error)) return undefined;

    const headers = (error as { headers?: unknown }).headers;
    if (typeof headers !== 'object' || headers === null) return undefined;

    const retryAfterMs = this.headerValue(headers, 'retry-after-ms');
    if (retryAfterMs !== undefined) {
      const parsed = Number(retryAfterMs);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
    }

    const retryAfterSeconds = this.headerValue(headers, 'retry-after');
    if (retryAfterSeconds === undefined) return undefined;
    const parsed = Number(retryAfterSeconds);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed * 1000 : undefined;
  }

  private headerValue(headers: object, name: string): string | undefined {
    const record = headers as Record<string, unknown>;
    const value = record[name] ?? record[name.toLowerCase()];
    return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
