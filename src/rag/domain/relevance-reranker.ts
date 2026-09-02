import { SearchHit } from './models';

export const RELEVANCE_RERANKER = Symbol('RELEVANCE_RERANKER');

/** Optional query-aware reranking stage applied after rank fusion. */
export interface RelevanceReranker {
  rerank(query: string, hits: SearchHit[], topK: number): Promise<SearchHit[]>;
}
