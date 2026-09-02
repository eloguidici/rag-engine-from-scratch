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
  const strategy = new ReciprocalRankFusionStrategy();

  it('rewards chunks supported by both semantic and lexical rankings', () => {
    const results = strategy.fuse([
      hit('balanced', 0.8, 0.8),
      hit('semantic-only', 0.95, 0),
      hit('lexical-only', 0, 0.95),
    ]);

    expect(results[0].chunk.id).toBe('balanced');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('does not award reciprocal-rank evidence to absent signals', () => {
    const results = strategy.fuse([
      hit('supported', 0.8, 0.7),
      hit('semantic-only', 0.9, 0),
      hit('unsupported', 0, 0),
    ]);

    expect(results.at(-1)?.chunk.id).toBe('unsupported');
    expect(results.at(-1)?.score).toBe(0);
  });
});
