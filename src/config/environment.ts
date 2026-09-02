export interface EnvironmentVariables {
  PORT?: string;
  OPENAI_API_KEY: string;
  OPENAI_EMBEDDING_MODEL?: string;
  OPENAI_CHAT_MODEL?: string;
  OPENAI_TIMEOUT_MS?: string;
  OPENAI_MAX_RETRIES?: string;
  RAG_CHUNK_SIZE?: string;
  RAG_CHUNK_OVERLAP?: string;
  RAG_CHUNK_MAX_TOKENS?: string;
  RAG_TOP_K?: string;
  RAG_MAX_CONTEXT_CHARS?: string;
  RAG_CANDIDATE_MULTIPLIER?: string;
  RAG_MIN_SCORE?: string;
  RAG_PERSISTENCE?: string;
  DATABASE_URL?: string;
  POSTGRES_POOL_MAX?: string;
}

/** Validates critical runtime configuration before the application starts. */
export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const rawApiKey = config.OPENAI_API_KEY;
  const openAiApiKey = typeof rawApiKey === 'string' ? rawApiKey.trim() : '';
  if (!openAiApiKey) {
    throw new Error('OPENAI_API_KEY is required');
  }

  const positiveIntegerKeys = [
    'PORT',
    'OPENAI_TIMEOUT_MS',
    'RAG_CHUNK_SIZE',
    'RAG_CHUNK_MAX_TOKENS',
    'RAG_TOP_K',
    'RAG_MAX_CONTEXT_CHARS',
    'POSTGRES_POOL_MAX',
  ] as const;

  for (const key of positiveIntegerKeys) {
    const value = config[key];
    if (value !== undefined && (!Number.isInteger(Number(value)) || Number(value) <= 0)) {
      throw new Error(`${key} must be a positive integer`);
    }
  }

  if (config.OPENAI_MAX_RETRIES !== undefined) {
    const maxRetries = Number(config.OPENAI_MAX_RETRIES);
    if (!Number.isInteger(maxRetries) || maxRetries < 0) {
      throw new Error('OPENAI_MAX_RETRIES must be a non-negative integer');
    }
  }

  if (config.RAG_CHUNK_OVERLAP !== undefined) {
    const overlap = Number(config.RAG_CHUNK_OVERLAP);
    if (!Number.isInteger(overlap) || overlap < 0) {
      throw new Error('RAG_CHUNK_OVERLAP must be a non-negative integer');
    }
  }

  if (config.RAG_CANDIDATE_MULTIPLIER !== undefined) {
    const multiplier = Number(config.RAG_CANDIDATE_MULTIPLIER);
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      throw new Error('RAG_CANDIDATE_MULTIPLIER must be greater than zero');
    }
  }

  if (config.RAG_MIN_SCORE !== undefined) {
    const minScore = Number(config.RAG_MIN_SCORE);
    if (!Number.isFinite(minScore) || minScore < 0) {
      throw new Error('RAG_MIN_SCORE must be zero or greater');
    }
  }

  const persistence = optionalString(config.RAG_PERSISTENCE) ?? 'memory';
  if (persistence !== 'memory' && persistence !== 'postgres') {
    throw new Error('RAG_PERSISTENCE must be memory or postgres');
  }

  const databaseUrl = optionalString(config.DATABASE_URL)?.trim();
  if (persistence === 'postgres' && !databaseUrl) {
    throw new Error('DATABASE_URL is required when RAG_PERSISTENCE=postgres');
  }

  return {
    PORT: optionalString(config.PORT),
    OPENAI_API_KEY: openAiApiKey,
    OPENAI_EMBEDDING_MODEL: optionalString(config.OPENAI_EMBEDDING_MODEL),
    OPENAI_CHAT_MODEL: optionalString(config.OPENAI_CHAT_MODEL),
    OPENAI_TIMEOUT_MS: optionalString(config.OPENAI_TIMEOUT_MS),
    OPENAI_MAX_RETRIES: optionalString(config.OPENAI_MAX_RETRIES),
    RAG_CHUNK_SIZE: optionalString(config.RAG_CHUNK_SIZE),
    RAG_CHUNK_OVERLAP: optionalString(config.RAG_CHUNK_OVERLAP),
    RAG_CHUNK_MAX_TOKENS: optionalString(config.RAG_CHUNK_MAX_TOKENS),
    RAG_TOP_K: optionalString(config.RAG_TOP_K),
    RAG_MAX_CONTEXT_CHARS: optionalString(config.RAG_MAX_CONTEXT_CHARS),
    RAG_CANDIDATE_MULTIPLIER: optionalString(config.RAG_CANDIDATE_MULTIPLIER),
    RAG_MIN_SCORE: optionalString(config.RAG_MIN_SCORE),
    RAG_PERSISTENCE: persistence,
    DATABASE_URL: databaseUrl,
    POSTGRES_POOL_MAX: optionalString(config.POSTGRES_POOL_MAX),
  };
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}
