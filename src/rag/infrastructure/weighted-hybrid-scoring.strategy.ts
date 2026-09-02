import { Injectable } from '@nestjs/common';
import {
  RetrievalScoreInput,
  RetrievalScoringStrategy,
} from '../domain/retrieval-scoring.strategy';

/**
 * Weighted hybrid strategy that combines cosine similarity with lightweight lexical scoring.
 * The weights are intentionally explicit so their trade-offs remain visible and testable.
 */
@Injectable()
export class WeightedHybridScoringStrategy implements RetrievalScoringStrategy {
  private readonly semanticWeight = 0.72;
  private readonly keywordWeight = 0.28;

  score(input: RetrievalScoreInput) {
    const keywordScore = this.keywordScore(
      this.tokenize(input.query),
      this.tokenize(input.chunk.text),
    );

    return {
      keywordScore,
      finalScore:
        input.semanticScore * this.semanticWeight + keywordScore * this.keywordWeight,
    };
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  }

  private keywordScore(queryTerms: string[], documentTerms: string[]): number {
    if (!queryTerms.length || !documentTerms.length) return 0;

    const frequencies = new Map<string, number>();
    for (const term of documentTerms) {
      frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
    }

    let score = 0;
    for (const term of new Set(queryTerms)) {
      const tf = frequencies.get(term) ?? 0;
      if (tf > 0) score += 1 + Math.log(tf);
    }

    return Math.min(score / Math.max(new Set(queryTerms).size, 1), 1);
  }
}
