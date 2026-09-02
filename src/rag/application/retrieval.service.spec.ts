import { ConfigService } from '@nestjs/config';
import { EmbeddedChunk, SearchHit } from '../domain/models';
import { EmbeddingProvider, VectorStore } from '../domain/ports';
import { DiversityReranker } from '../infrastructure/diversity-reranker';
import { ReciprocalRankFusionStrategy } from '../infrastructure/reciprocal-rank-fusion.strategy';
import { WeightedHybridScoringStrategy } from '../infrastructure/weighted-hybrid-scoring.strategy';
import { RetrievalService } from './retrieval.service';

const chunks: EmbeddedChunk[] = [
  {
    id: 'finance:0',
    documentId: 'finance',
    index: 0,
    text: 'Invoice payment approval is handled by the finance team.',
    metadata: { category: 'finance' },
    vector: [1, 0],
  },
  {
    id: 'finance:1',
    documentId: 'finance',
    index: 1,
    text: 'Invoice payment approval is handled by the finance team.',
    metadata: { category: 'finance' },
    vector: [0.98, 0.02],
  },
  {
    id: 'ops:0',
    documentId: 'ops',
    index: 0,
    text: 'Operations reviews shipment incidents and delivery exceptions.',
    metadata: { category: 'operations' },
    vector: [0, 1],
  },
];

class FakeEmbeddingProvider implements EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]> {
    void texts;
    return Promise.resolve([[1, 0]]);
  }
}

class FakeVectorStore implements VectorStore {
  upsert(chunksToStore: EmbeddedChunk[]): Promise<void> {
    void chunksToStore;
    return Promise.resolve();
  }

  all(): Promise<EmbeddedChunk[]> {
    return Promise.resolve(chunks);
  }

  semanticSearch(_queryVector: number[], topK: number): Promise<SearchHit[]> {
    return Promise.resolve(
      chunks.slice(0, topK).map((chunk) => ({
        chunk,
        semanticScore: chunk.id.startsWith('finance') ? 0.95 : 0.1,
        keywordScore: 0,
        score: 0,
      })),
    );
  }
}

describe('RetrievalService', () => {
  it('applies metadata filters, fusion, thresholding and diversity reranking', async () => {
    const service = new RetrievalService(
      new FakeEmbeddingProvider(),
      new FakeVectorStore(),
      new WeightedHybridScoringStrategy(),
      new ReciprocalRankFusionStrategy(),
      new DiversityReranker(),
      new ConfigService({ RAG_CANDIDATE_MULTIPLIER: 4, RAG_MIN_SCORE: 0.01 }),
    );

    const results = await service.search('invoice payment approval', 3, {
      category: 'finance',
    });

    expect(results).toHaveLength(1);
    expect(results[0].chunk.documentId).toBe('finance');
    expect(results[0].score).toBeGreaterThan(0);
  });

  it('drops candidates below the configured minimum score', async () => {
    const service = new RetrievalService(
      new FakeEmbeddingProvider(),
      new FakeVectorStore(),
      new WeightedHybridScoringStrategy(),
      undefined,
      undefined,
      new ConfigService({ RAG_CANDIDATE_MULTIPLIER: 2, RAG_MIN_SCORE: 0.99 }),
    );

    const results = await service.search('invoice payment approval', 2);

    expect(results).toEqual([]);
  });
});
