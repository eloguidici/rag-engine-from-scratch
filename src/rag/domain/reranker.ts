import { SearchHit } from './models';

export const RERANKER = Symbol('RERANKER');

/** Post-retrieval ranking stage used for relevance and diversity adjustments. */
export interface Reranker {
  rerank(hits: SearchHit[], topK: number): SearchHit[];
}
