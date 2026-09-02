import { SearchHit } from './models';

export const RETRIEVAL_FUSION_STRATEGY = Symbol('RETRIEVAL_FUSION_STRATEGY');

/** Combines independently ranked retrieval signals into a single ranking. */
export interface RetrievalFusionStrategy {
  fuse(hits: SearchHit[]): SearchHit[];
}
