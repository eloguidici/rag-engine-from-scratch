import { Injectable } from '@nestjs/common';
import { SearchHit } from '../domain/models';
import { Reranker } from '../domain/reranker';

/**
 * Removes near-duplicate chunks and limits repeated evidence from the same
 * document so the generation context contains broader supporting evidence.
 */
@Injectable()
export class DiversityReranker implements Reranker {
  private readonly similarityThreshold = 0.85;
  private readonly maxChunksPerDocument = 2;

  rerank(hits: SearchHit[], topK: number): SearchHit[] {
    const selected: SearchHit[] = [];
    const perDocument = new Map<string, number>();

    for (const hit of hits) {
      if ((perDocument.get(hit.chunk.documentId) ?? 0) >= this.maxChunksPerDocument) {
        continue;
      }

      const isNearDuplicate = selected.some(
        (existing) =>
          this.jaccardSimilarity(existing.chunk.text, hit.chunk.text) >=
          this.similarityThreshold,
      );
      if (isNearDuplicate) continue;

      selected.push(hit);
      perDocument.set(
        hit.chunk.documentId,
        (perDocument.get(hit.chunk.documentId) ?? 0) + 1,
      );

      if (selected.length >= topK) break;
    }

    return selected;
  }

  private jaccardSimilarity(left: string, right: string): number {
    const leftTokens = new Set(this.tokenize(left));
    const rightTokens = new Set(this.tokenize(right));
    if (leftTokens.size === 0 && rightTokens.size === 0) return 1;

    let intersection = 0;
    for (const token of leftTokens) {
      if (rightTokens.has(token)) intersection += 1;
    }

    const union = new Set([...leftTokens, ...rightTokens]).size;
    return union === 0 ? 0 : intersection / union;
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  }
}
