import { Inject, Injectable } from '@nestjs/common';
import { SearchHit } from '../domain/models';
import { EMBEDDING_PROVIDER, EmbeddingProvider, VECTOR_STORE, VectorStore } from '../domain/ports';

@Injectable()
export class RetrievalService {
  constructor(
    @Inject(EMBEDDING_PROVIDER) private readonly embeddings: EmbeddingProvider,
    @Inject(VECTOR_STORE) private readonly store: VectorStore,
  ) {}

  async search(query: string, topK: number): Promise<SearchHit[]> {
    const [queryVector] = await this.embeddings.embed([query]);
    const semantic = await this.store.semanticSearch(queryVector, Math.max(topK * 3, topK));
    const all = await this.store.all();
    const terms = this.tokenize(query);

    const semanticById = new Map(semantic.map((hit) => [hit.chunk.id, hit.semanticScore]));
    return all
      .map((chunk) => {
        const keywordScore = this.keywordScore(terms, this.tokenize(chunk.text));
        const semanticScore = semanticById.get(chunk.id) ?? 0;
        const score = semanticScore * 0.72 + keywordScore * 0.28;
        return { chunk, semanticScore, keywordScore, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  }

  private keywordScore(queryTerms: string[], documentTerms: string[]): number {
    if (!queryTerms.length || !documentTerms.length) return 0;
    const frequencies = new Map<string, number>();
    for (const term of documentTerms) frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
    let score = 0;
    for (const term of new Set(queryTerms)) {
      const tf = frequencies.get(term) ?? 0;
      if (tf > 0) score += 1 + Math.log(tf);
    }
    return Math.min(score / Math.max(new Set(queryTerms).size, 1), 1);
  }
}
