import { Injectable } from '@nestjs/common';
import { SearchHit } from '../domain/models';

export interface BuiltContext {
  context: string;
  sources: Array<{
    documentId: string;
    chunkId: string;
    title: string;
    excerpt: string;
    score: number;
  }>;
}

/**
 * Converts ranked retrieval results into the constrained context consumed by
 * the generation provider and into stable citation metadata returned by the API.
 */
@Injectable()
export class ContextBuilderService {
  build(hits: SearchHit[]): BuiltContext {
    const context = hits
      .map((hit, index) => {
        const title = String(hit.chunk.metadata.title ?? hit.chunk.documentId);
        return `[S${index + 1}] ${title}\n${hit.chunk.text}`;
      })
      .join('\n\n');

    const sources = hits.map((hit) => ({
      documentId: hit.chunk.documentId,
      chunkId: hit.chunk.id,
      title: String(hit.chunk.metadata.title ?? ''),
      excerpt: hit.chunk.text.slice(0, 280),
      score: Number(hit.score.toFixed(4)),
    }));

    return { context, sources };
  }
}
