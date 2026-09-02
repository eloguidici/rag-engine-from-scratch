import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { EmbeddingProvider, GenerationProvider } from '../domain/ports';

@Injectable()
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private readonly client: OpenAI;
  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({ apiKey: this.config.get<string>('OPENAI_API_KEY') });
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const response = await this.client.embeddings.create({
      model: this.config.get<string>('OPENAI_EMBEDDING_MODEL') ?? 'text-embedding-3-small',
      input: texts,
    });
    return response.data.map((item) => item.embedding);
  }
}

@Injectable()
export class OpenAIGenerationProvider implements GenerationProvider {
  private readonly client: OpenAI;
  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({ apiKey: this.config.get<string>('OPENAI_API_KEY') });
  }

  async generate(question: string, context: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.config.get<string>('OPENAI_CHAT_MODEL') ?? 'gpt-4.1-mini',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: 'Answer only from the supplied context. If the context does not contain the answer, say that you do not have enough evidence. Cite sources using [S1], [S2], etc.',
        },
        { role: 'user', content: `QUESTION:\n${question}\n\nCONTEXT:\n${context}` },
      ],
    });
    return response.choices[0]?.message.content ?? 'No answer generated.';
  }
}
