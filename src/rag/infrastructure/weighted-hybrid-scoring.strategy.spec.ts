import { Chunk } from '../domain/models';
import { WeightedHybridScoringStrategy } from './weighted-hybrid-scoring.strategy';

describe('WeightedHybridScoringStrategy', () => {
  const strategy = new WeightedHybridScoringStrategy();
  const corpus: Chunk[] = [
    {
      id: 'c1',
      documentId: 'd1',
      index: 0,
      text: 'The invoice payment status is currently pending.',
      metadata: {},
    },
    {
      id: 'c2',
      documentId: 'd2',
      index: 0,
      text: 'Observability metrics include latency and throughput.',
      metadata: {},
    },
  ];

  it('rewards BM25 lexical relevance in addition to semantic similarity', () => {
    const result = strategy.score({
      query: 'invoice payment status',
      semanticScore: 0.6,
      chunk: corpus[0],
      corpus,
    });

    expect(result.keywordScore).toBeGreaterThan(0);
    expect(result.keywordScore).toBeLessThan(1);
    expect(result.finalScore).toBeGreaterThan(0.6 * 0.72);
  });

  it('falls back to semantic evidence when there is no lexical overlap', () => {
    const result = strategy.score({
      query: 'invoice payment status',
      semanticScore: 0.8,
      chunk: corpus[1],
      corpus,
    });

    expect(result.keywordScore).toBe(0);
    expect(result.finalScore).toBeCloseTo(0.8 * 0.72);
  });
});
