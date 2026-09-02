import {
  ndcgAtK,
  recallAtK,
  reciprocalRank,
  summarizeRetrievalEvaluation,
} from './retrieval-metrics';

describe('retrieval metrics', () => {
  it('computes recall at k', () => {
    expect(recallAtK(['doc-a', 'doc-b'], ['doc-x', 'doc-a', 'doc-y'], 3)).toBe(0.5);
  });

  it('computes reciprocal rank from the first relevant result', () => {
    expect(reciprocalRank(['doc-a'], ['doc-x', 'doc-a'])).toBe(0.5);
    expect(reciprocalRank(['doc-a'], ['doc-x', 'doc-y'])).toBe(0);
  });

  it('computes normalized discounted cumulative gain', () => {
    expect(ndcgAtK(['doc-a', 'doc-b'], ['doc-a', 'doc-x', 'doc-b'], 3)).toBeGreaterThan(0.9);
    expect(ndcgAtK(['doc-a'], ['doc-x', 'doc-y'], 2)).toBe(0);
  });

  it('summarizes a retrieval evaluation set', () => {
    const result = summarizeRetrievalEvaluation(
      [
        {
          question: 'q1',
          relevantDocumentIds: ['doc-a'],
          retrievedDocumentIds: ['doc-a', 'doc-b'],
        },
        {
          question: 'q2',
          relevantDocumentIds: ['doc-c'],
          retrievedDocumentIds: ['doc-x', 'doc-c'],
        },
      ],
      2,
    );

    expect(result.cases).toBe(2);
    expect(result.recallAtK).toBe(1);
    expect(result.meanReciprocalRank).toBe(0.75);
    expect(result.ndcgAtK).toBeGreaterThan(0.8);
  });
});
