export interface EnvironmentVariables {
  PORT?: string;
  OPENAI_API_KEY: string;
  OPENAI_EMBEDDING_MODEL?: string;
  OPENAI_CHAT_MODEL?: string;
  RAG_CHUNK_SIZE?: string;
  RAG_CHUNK_OVERLAP?: string;
  RAG_TOP_K?: string;
  RAG_MAX_CONTEXT_CHARS?: string;
  RAG_CANDIDATE_MULTIPLIER?: string;
  RAG_MIN_SCORE?: string;
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
    'RAG_CHUNK_SIZE',
    'RAG_TOP_K',
    'RAG_MAX_CONTEXT_CHARS',
  ] as const;

  for (const key of positiveIntegerKeys) {
    const value = config[key];
    if (value !== undefined && (!Number.isInteger(Number(value)) || Number(value) <= 0)) {
      throw new Error(`${key} must be a positive integer`);
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

  return { ...(config as EnvironmentVariables), OPENAI_API_KEY: openAiApiKey };
}
