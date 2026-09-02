import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Chunk, SourceDocument } from '../domain/models';

@Injectable()
export class TextChunkerService {
  constructor(private readonly config: ConfigService) {}

  chunk(document: SourceDocument): Chunk[] {
    const chunkSize = Number(this.config.get('RAG_CHUNK_SIZE') ?? 900);
    const overlap = Number(this.config.get('RAG_CHUNK_OVERLAP') ?? 150);
    const normalized = document.content.replace(/\s+/g, ' ').trim();
    if (!normalized) return [];

    const chunks: Chunk[] = [];
    let start = 0;
    let index = 0;

    while (start < normalized.length) {
      let end = Math.min(start + chunkSize, normalized.length);
      if (end < normalized.length) {
        const sentenceBoundary = normalized.lastIndexOf('. ', end);
        const whitespaceBoundary = normalized.lastIndexOf(' ', end);
        const boundary = sentenceBoundary > start + chunkSize * 0.6
          ? sentenceBoundary + 1
          : whitespaceBoundary > start + chunkSize * 0.6
            ? whitespaceBoundary
            : end;
        end = boundary;
      }

      const text = normalized.slice(start, end).trim();
      if (text) {
        chunks.push({
          id: `${document.id}:${index}`,
          documentId: document.id,
          text,
          index,
          metadata: { title: document.title, ...(document.metadata ?? {}) },
        });
      }

      if (end >= normalized.length) break;
      start = Math.max(end - overlap, start + 1);
      index += 1;
    }

    return chunks;
  }
}
