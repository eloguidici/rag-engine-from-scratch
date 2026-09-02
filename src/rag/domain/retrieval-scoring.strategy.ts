import { Chunk } from './models';

export const RETRIEVAL_SCORING_STRATEGY = Symbol('RETRIEVAL_SCORING_STRATEGY');

/** Input required by a retrieval scoring strategy. */
export interface RetrievalScoreInput {
  query: string;
  chunk: Chunk;
  semanticScore: number;
}

/**
 * Strategy abstraction used to combine semantic and lexical evidence.
 * Implementations can be replaced without changing the retrieval orchestration.
 */
export interface RetrievalScoringStrategy {
  score(input: RetrievalScoreInput): {
    keywordScore: number;
    finalScore: number;
  };
}
