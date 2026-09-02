import { WeightedHybridScoringStrategy } from './weighted-hybrid-scoring.strategy';

describe('WeightedHybridScoringStrategy', () => {
  const strategy = new WeightedHybridScoringStrategy();

  it('rewards exact lexical overlap in addition to semantic similarity', () => {
    const result = strategy.score({
      query: 'invoice payment status',
      semanticScore: 0.6,
      chunk: {
        id: 'c1',
        documentId: 'd1',
        index: 0,
        text: 'The invoice payment status is currently pending.',
        metadata: {},
      },
    });

    expect(result.keywordScore).toBeGreaterThan(0);
    expect(result.finalScore).toBeGreaterThan(0.6 * 0.72);
  });

  it('falls back to semantic evidence when there is no lexical overlap', () => {
    const result = strategy.score({
      query: 'invoice payment status',
      semanticScore: 0.8,
      chunk: {
        id: 'c1',
        documentId: 'd1',
        index: 0,
        text: 'Completely unrelated vocabulary.',
        metadata: {},
      },
    });

    expect(result.keywordScore).toBe(0);
    expect(result.finalScore).toBeCloseTo(0.8 * 0.72);
  });
});
