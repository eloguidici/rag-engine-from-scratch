import { Injectable } from '@nestjs/common';
import { Chunk } from '../domain/models';
import {
  RetrievalScoreInput,
  RetrievalScoringStrategy,
} from '../domain/retrieval-scoring.strategy';

/**
 * Weighted hybrid strategy combining cosine similarity with BM25 lexical relevance.
 * BM25 is calculated over the filtered retrieval corpus so exact identifiers and
 * domain terminology are preserved without depending on an external search engine.
 */
@Injectable()
export class WeightedHybridScoringStrategy implements RetrievalScoringStrategy {
  private readonly semanticWeight = 0.72;
  private readonly keywordWeight = 0.28;
  private readonly k1 = 1.5;
  private readonly b = 0.75;

  score(input: RetrievalScoreInput): { keywordScore: number; finalScore: number } {
    const keywordScore = this.bm25(input.query, input.chunk, input.corpus);
    return {
      keywordScore,
      finalScore:
        input.semanticScore * this.semanticWeight + keywordScore * this.keywordWeight,
    };
  }

  private bm25(query: string, chunk: Chunk, corpus: Chunk[]): number {
    const queryTerms = [...new Set(this.tokenize(query))];
    if (!queryTerms.length || !corpus.length) return 0;

    const documentTerms = this.tokenize(chunk.text);
    if (!documentTerms.length) return 0;

    const averageDocumentLength =
      corpus.reduce((sum, item) => sum + this.tokenize(item.text).length, 0) /
      corpus.length;

    const frequencies = new Map<string, number>();
    for (const term of documentTerms) {
      frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
    }

    let rawScore = 0;
    for (const term of queryTerms) {
      const termFrequency = frequencies.get(term) ?? 0;
      if (termFrequency === 0) continue;

      const documentsContainingTerm = corpus.reduce(
        (count, item) =>
          this.tokenize(item.text).includes(term) ? count + 1 : count,
        0,
      );
      const inverseDocumentFrequency = Math.log(
        1 +
          (corpus.length - documentsContainingTerm + 0.5) /
            (documentsContainingTerm + 0.5),
      );
      const lengthNormalization =
        this.k1 *
        (1 - this.b + this.b * (documentTerms.length / Math.max(averageDocumentLength, 1)));

      rawScore +=
        inverseDocumentFrequency *
        ((termFrequency * (this.k1 + 1)) / (termFrequency + lengthNormalization));
    }

    // Normalize the unbounded BM25 score to [0, 1) before combining it with cosine similarity.
    return rawScore <= 0 ? 0 : rawScore / (1 + rawScore);
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  }
}
