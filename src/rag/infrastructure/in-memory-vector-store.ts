import { Injectable } from '@nestjs/common';
import { EmbeddedChunk, SearchHit } from '../domain/models';
import { VectorStore } from '../domain/ports';

@Injectable()
export class InMemoryVectorStore implements VectorStore {
  private readonly chunks = new Map<string, EmbeddedChunk>();

  upsert(chunks: EmbeddedChunk[]): Promise<void> {
    for (const chunk of chunks) this.chunks.set(chunk.id, chunk);
    return Promise.resolve();
  }

  all(): Promise<EmbeddedChunk[]> {
    return Promise.resolve([...this.chunks.values()]);
  }

  semanticSearch(queryVector: number[], topK: number): Promise<SearchHit[]> {
    const results = [...this.chunks.values()]
      .map((chunk) => ({
        chunk,
        semanticScore: this.cosineSimilarity(queryVector, chunk.vector),
        keywordScore: 0,
        score: 0,
      }))
      .sort((a, b) => b.semanticScore - a.semanticScore)
      .slice(0, topK);

    return Promise.resolve(results);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i += 1) {
      dot += a[i] * b[i];
      normA += a[i] ** 2;
      normB += b[i] ** 2;
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
