import { Inject, Injectable } from '@nestjs/common';
import { SearchHit } from '../domain/models';
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
  async search(query: string, topK: number): Promise<SearchHit[]> {
    const [queryVector] = await this.embeddings.embed([query]);
    const semantic = await this.store.semanticSearch(queryVector, Math.max(topK * 3, topK));
    const all = await this.store.all();
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
}
