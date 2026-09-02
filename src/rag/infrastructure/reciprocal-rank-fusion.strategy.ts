import { Injectable } from '@nestjs/common';
import { SearchHit } from '../domain/models';
import { RetrievalFusionStrategy } from '../domain/retrieval-fusion.strategy';

/**
 * Reciprocal Rank Fusion combines semantic and lexical rankings without
 * requiring both score scales to be calibrated against each other.
 */
@Injectable()
export class ReciprocalRankFusionStrategy implements RetrievalFusionStrategy {
  private readonly rankConstant = 60;

  fuse(hits: SearchHit[]): SearchHit[] {
    const semanticRank = this.rankBy(hits, (hit) => hit.semanticScore);
    const lexicalRank = this.rankBy(hits, (hit) => hit.keywordScore);

    return hits
      .map((hit) => {
        const semanticPosition = semanticRank.get(hit.chunk.id);
        const lexicalPosition = lexicalRank.get(hit.chunk.id);
        const semanticContribution = semanticPosition
          ? 1 / (this.rankConstant + semanticPosition)
          : 0;
        const lexicalContribution = lexicalPosition
          ? 1 / (this.rankConstant + lexicalPosition)
          : 0;

        return {
          ...hit,
          score: semanticContribution + lexicalContribution,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  private rankBy(
    hits: SearchHit[],
    selector: (hit: SearchHit) => number,
  ): Map<string, number> {
    return new Map(
      [...hits]
        .sort((a, b) => selector(b) - selector(a))
        .map((hit, index) => [hit.chunk.id, index + 1]),
    );
  }
}
