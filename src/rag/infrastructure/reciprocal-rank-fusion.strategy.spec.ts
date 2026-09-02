import { SearchHit } from '../domain/models';
import { ReciprocalRankFusionStrategy } from './reciprocal-rank-fusion.strategy';

const hit = (
  id: string,
  semanticScore: number,
  keywordScore: number,
): SearchHit => ({
  chunk: {
    id,
    documentId: id,
    index: 0,
    text: id,
    metadata: {},
  },
  semanticScore,
  keywordScore,
  score: 0,
});

describe('ReciprocalRankFusionStrategy', () => {
  it('rewards chunks that rank well across semantic and lexical signals', () => {
    const strategy = new ReciprocalRankFusionStrategy();
    const results = strategy.fuse([
      hit('balanced', 0.8, 0.8),
      hit('semantic-only', 0.95, 0.1),
      hit('lexical-only', 0.1, 0.95),
    ]);

    expect(results[0].chunk.id).toBe('balanced');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });
});
