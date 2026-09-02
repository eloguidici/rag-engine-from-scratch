import { Inject, Injectable } from '@nestjs/common';
import { EmbeddedChunk, SearchHit } from '../domain/models';
import { EMBEDDING_PROVIDER, EmbeddingProvider, VECTOR_STORE, VectorStore } from '../domain/ports';
import {
  RETRIEVAL_SCORING_STRATEGY,
  RetrievalScoringStrategy,
} from '../domain/retrieval-scoring.strategy';

/** Coordinates semantic retrieval and delegates final ranking to a pluggable strategy. */
@Injectable()
export class RetrievalService {
  constructor(
    @Inject(EMBEDDING_PROVIDER) private readonly embeddings: EmbeddingProvider,
    @Inject(VECTOR_STORE) private readonly store: VectorStore,
    @Inject(RETRIEVAL_SCORING_STRATEGY)
    private readonly scoringStrategy: RetrievalScoringStrategy,
  ) {}

  /** Returns the highest-ranked chunks for a natural-language query. */
  async search(
    query: string,
    topK: number,
    filters?: Record<string, string | number | boolean>,
  ): Promise<SearchHit[]> {
    const [queryVector] = await this.embeddings.embed([query]);
    const semantic = await this.store.semanticSearch(queryVector, Math.max(topK * 5, topK));
    const all = this.applyMetadataFilters(await this.store.all(), filters);
    const semanticById = new Map(semantic.map((hit) => [hit.chunk.id, hit.semanticScore]));

    return all
      .map((chunk) => {
        const semanticScore = semanticById.get(chunk.id) ?? 0;
        const { keywordScore, finalScore } = this.scoringStrategy.score({
          query,
          chunk,
          semanticScore,
        });

        return { chunk, semanticScore, keywordScore, score: finalScore };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  private applyMetadataFilters(
    chunks: EmbeddedChunk[],
    filters?: Record<string, string | number | boolean>,
  ): EmbeddedChunk[] {
    if (!filters || Object.keys(filters).length === 0) return chunks;

    return chunks.filter((chunk) =>
      Object.entries(filters).every(([key, expected]) => chunk.metadata[key] === expected),
    );
  }
}
