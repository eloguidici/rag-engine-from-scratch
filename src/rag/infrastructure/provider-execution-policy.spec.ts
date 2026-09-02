import { ConfigService } from '@nestjs/config';
import { ProviderExecutionPolicy } from './provider-execution-policy';

describe('ProviderExecutionPolicy', () => {
  it('retries transient failures and returns the successful result', async () => {
    const policy = new ProviderExecutionPolicy(
      new ConfigService({
        PROVIDER_TIMEOUT_MS: '1000',
        PROVIDER_MAX_RETRIES: '2',
        PROVIDER_RETRY_BASE_MS: '1',
      }),
    );
    const operation = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(Object.assign(new Error('rate limited'), { status: 429 }))
      .mockResolvedValue('ok');

    await expect(policy.execute(operation)).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-transient client errors', async () => {
    const policy = new ProviderExecutionPolicy(
      new ConfigService({
        PROVIDER_TIMEOUT_MS: '1000',
        PROVIDER_MAX_RETRIES: '2',
        PROVIDER_RETRY_BASE_MS: '1',
      }),
    );
    const error = Object.assign(new Error('invalid request'), { status: 400 });
    const operation = jest.fn<Promise<string>, []>().mockRejectedValue(error);

    await expect(policy.execute(operation)).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('enforces the configured timeout', async () => {
    const policy = new ProviderExecutionPolicy(
      new ConfigService({
        PROVIDER_TIMEOUT_MS: '5',
        PROVIDER_MAX_RETRIES: '0',
      }),
    );

    await expect(
      policy.execute(() => new Promise<string>(() => undefined)),
    ).rejects.toThrow('Provider request timed out after 5ms');
  });
});
