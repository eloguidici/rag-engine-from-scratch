import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ExternalProviderError,
  InvalidProviderResponseError,
} from '../domain/errors';
import { SearchHit } from '../domain/models';
import { RelevanceReranker } from '../domain/relevance-reranker';

@Injectable()
export class NoOpRelevanceReranker implements RelevanceReranker {
  rerank(query: string, hits: SearchHit[], topK: number): Promise<SearchHit[]> {
    void query;
    void topK;
    return Promise.resolve(hits);
  }
}

/**
 * Query-aware semantic reranker using Cohere's rerank endpoint. The adapter is
 * optional and isolated behind a port so retrieval remains provider-agnostic.
 */
@Injectable()
export class CohereRelevanceReranker implements RelevanceReranker {
  constructor(private readonly config: ConfigService) {}

  async rerank(query: string, hits: SearchHit[], topK: number): Promise<SearchHit[]> {
    if (hits.length === 0) return [];

    const apiKey = this.config.get<string>('COHERE_API_KEY')?.trim();
    if (!apiKey) {
      throw new ExternalProviderError(
        'cohere-rerank',
        'Cohere reranker is enabled but COHERE_API_KEY is missing',
      );
    }

    const model = this.config.get<string>('COHERE_RERANK_MODEL') ?? 'rerank-v3.5';
    const timeoutMs = Number(
      this.config.get<string>('RAG_RERANK_TIMEOUT_MS') ?? 10_000,
    );
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://api.cohere.com/v2/rerank', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          query,
          documents: hits.map((hit) => hit.chunk.text),
          top_n: Math.min(Math.max(topK, 1), hits.length),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as {
        results?: Array<{ index: number; relevance_score: number }>;
      };

      if (!Array.isArray(payload.results)) {
        throw new InvalidProviderResponseError(
          'Cohere rerank response did not contain a results array',
        );
      }

      return payload.results.map((item) => {
        if (
          !Number.isInteger(item.index) ||
          item.index < 0 ||
          item.index >= hits.length ||
          !Number.isFinite(item.relevance_score)
        ) {
          throw new InvalidProviderResponseError(
            'Cohere rerank response contained an invalid result item',
          );
        }

        return { ...hits[item.index], score: item.relevance_score };
      });
    } catch (error) {
      throw new ExternalProviderError(
        'cohere-rerank',
        'Semantic reranking failed',
        error,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
