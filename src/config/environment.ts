export interface EnvironmentVariables {
  PORT?: string;
  OPENAI_API_KEY: string;
  OPENAI_EMBEDDING_MODEL?: string;
  OPENAI_CHAT_MODEL?: string;
  RAG_CHUNK_SIZE?: string;
  RAG_CHUNK_OVERLAP?: string;
  RAG_TOP_K?: string;
  RAG_MAX_CONTEXT_CHARS?: string;
}

/** Validates critical runtime configuration before the application starts. */
export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const openAiApiKey = String(config.OPENAI_API_KEY ?? '').trim();
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

  return config as unknown as EnvironmentVariables;
}
