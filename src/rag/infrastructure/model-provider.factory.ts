import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface ModelProviderProfile {
  kind: 'openai' | 'openai-compatible';
  client: OpenAI;
  embeddingModel: string;
  chatModel: string;
  embeddingLabel: string;
  generationLabel: string;
}

/** Builds provider-specific SDK configuration while preserving application-facing ports. */
@Injectable()
export class ModelProviderFactory {
  constructor(private readonly config: ConfigService) {}

  create(): ModelProviderProfile {
    const kind = (this.config.get<string>('MODEL_PROVIDER') ?? 'openai') as
      | 'openai'
      | 'openai-compatible';
    const baseURL = this.config.get<string>('OPENAI_BASE_URL');
    const apiKey = this.config.get<string>('OPENAI_API_KEY') ?? (kind === 'openai' ? '' : 'local');

    const client = new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });

    return {
      kind,
      client,
      embeddingModel:
        this.config.get<string>('OPENAI_EMBEDDING_MODEL') ?? 'text-embedding-3-small',
      chatModel: this.config.get<string>('OPENAI_CHAT_MODEL') ?? 'gpt-4.1-mini',
      embeddingLabel: `${kind}-embeddings`,
      generationLabel: `${kind}-generation`,
    };
  }
}
