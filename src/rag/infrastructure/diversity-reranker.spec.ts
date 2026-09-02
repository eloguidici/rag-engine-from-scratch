import { SearchHit } from '../domain/models';
import { DiversityReranker } from './diversity-reranker';

const hit = (
  id: string,
  documentId: string,
  text: string,
  score: number,
): SearchHit => ({
  chunk: { id, documentId, index: 0, text, metadata: {} },
  semanticScore: score,
  keywordScore: score,
  score,
});

describe('DiversityReranker', () => {
  it('removes near duplicates and limits repeated evidence per document', () => {
    const reranker = new DiversityReranker();
    const results = reranker.rerank(
      [
        hit('a1', 'a', 'invoice payment pending approval finance team', 0.9),
        hit('a2', 'a', 'invoice payment pending approval finance team', 0.89),
        hit('a3', 'a', 'finance workflow requires secondary approval', 0.8),
        hit('a4', 'a', 'finance workflow includes treasury validation', 0.79),
        hit('b1', 'b', 'payment status is synchronized every hour', 0.7),
      ],
      4,
    );

    expect(results.map((item) => item.chunk.id)).toEqual(['a1', 'a3', 'b1']);
  });
});
