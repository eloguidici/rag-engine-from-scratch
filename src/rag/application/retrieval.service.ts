import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddedChunk, SearchHit } from '../domain/models';
import { EMBEDDING_PROVIDER, EmbeddingProvider, VECTOR_STORE, VectorStore } from '../domain/ports';
import {
  RETRIEVAL_FUSION_STRATEGY,
  RetrievalFusionStrategy,
} from '../domain/retrieval-fusion.strategy';
import { RERANKER, Reranker } from '../domain/reranker';
import {
  RETRIEVAL_SCORING_STRATEGY,
  RetrievalScoringStrategy,
} from '../domain/retrieval-scoring.strategy';

/** Coordinates candidate generation, fusion, thresholding, and reranking. */
@Injectable()
export class RetrievalService {
  constructor(
    @Inject(EMBEDDING_PROVIDER) private readonly embeddings: EmbeddingProvider,
    @Inject(VECTOR_STORE) private readonly store: VectorStore,
    @Inject(RETRIEVAL_SCORING_STRATEGY)
    private readonly scoringStrategy: RetrievalScoringStrategy,
    @Optional()
    @Inject(RETRIEVAL_FUSION_STRATEGY)
    private readonly fusionStrategy?: RetrievalFusionStrategy,
    @Optional()
    @Inject(RERANKER)
    private readonly reranker?: Reranker,
    @Optional() private readonly config?: ConfigService,
  ) {}

  /** Returns the highest-ranked, diverse chunks for a natural-language query. */
  async search(
    query: string,
    topK: number,
    filters?: Record<string, string | number | boolean>,
  ): Promise<SearchHit[]> {
    const candidateMultiplier = this.positiveNumberConfig('RAG_CANDIDATE_MULTIPLIER', 5);
    const minScore = this.nonNegativeNumberConfig('RAG_MIN_SCORE', 0);
    const candidateLimit = Math.max(Math.ceil(topK * candidateMultiplier), topK);

    const [queryVector] = await this.embeddings.embed([query]);
    const semantic = await this.store.semanticSearch(queryVector, candidateLimit);
    const all = this.applyMetadataFilters(await this.store.all(), filters);
    const semanticById = new Map(semantic.map((hit) => [hit.chunk.id, hit.semanticScore]));

    const candidates = all
      .map((chunk) => {
        const semanticScore = semanticById.get(chunk.id) ?? 0;
        const { keywordScore, finalScore } = this.scoringStrategy.score({
          query,
          chunk,
          corpus: all,
          semanticScore,
        });

        return { chunk, semanticScore, keywordScore, score: finalScore };
      })
      .filter((hit) => hit.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, candidateLimit);

    const fused = this.fusionStrategy
      ? this.fusionStrategy.fuse(candidates)
      : candidates;

    return this.reranker
      ? this.reranker.rerank(fused, topK)
      : fused.slice(0, topK);
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

  private positiveNumberConfig(key: string, fallback: number): number {
    const value = Number(this.config?.get(key) ?? fallback);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private nonNegativeNumberConfig(key: string, fallback: number): number {
    const value = Number(this.config?.get(key) ?? fallback);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }
}
