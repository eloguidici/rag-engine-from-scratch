/** Base error for failures that originate outside the application boundary. */
export class ExternalProviderError extends Error {
  constructor(
    public readonly provider: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ExternalProviderError';
  }
}

/** Raised when an external provider returns a structurally invalid response. */
export class InvalidProviderResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProviderResponseError';
  }
}
