import { Injectable } from '@nestjs/common';
import { Chunk, SourceDocument } from '../domain/models';
import { ChunkingOptions, ChunkingStrategy } from '../domain/chunking-strategy';

/**
 * Recursive character chunker that prefers paragraph, sentence, and whitespace
 * boundaries while also enforcing a conservative estimated token budget.
 */
@Injectable()
export class RecursiveChunkingStrategy implements ChunkingStrategy {
  chunk(document: SourceDocument, options: ChunkingOptions): Chunk[] {
    const normalized = document.content.replace(/\r\n/g, '\n').replace(/[\t ]+/g, ' ').trim();
    if (!normalized) return [];

    const maxCharacters = Math.min(
      options.maxCharacters,
      Math.max(options.estimatedMaxTokens * 4, 1),
    );
    const pieces = this.splitRecursively(normalized, maxCharacters, ['\n\n', '. ', ' ', '']);
    const texts = this.withOverlap(pieces, options.overlapCharacters, maxCharacters);

    return texts.map((text, index) => ({
      id: `${document.id}:${index}`,
      documentId: document.id,
      text,
      index,
      metadata: { title: document.title, ...(document.metadata ?? {}) },
    }));
  }

  private splitRecursively(text: string, limit: number, separators: string[]): string[] {
    if (text.length <= limit) return [text.trim()].filter(Boolean);
    const [separator, ...rest] = separators;
    if (separator === undefined) return [text.slice(0, limit), ...this.splitRecursively(text.slice(limit), limit, [''])];

    if (separator === '') {
      const chunks: string[] = [];
      for (let start = 0; start < text.length; start += limit) {
        chunks.push(text.slice(start, start + limit).trim());
      }
      return chunks.filter(Boolean);
    }

    const parts = text.split(separator);
    if (parts.length === 1) return this.splitRecursively(text, limit, rest);

    const chunks: string[] = [];
    let current = '';
    for (const part of parts) {
      const candidate = current ? `${current}${separator}${part}` : part;
      if (candidate.length <= limit) {
        current = candidate;
        continue;
      }
      if (current.trim()) chunks.push(current.trim());
      if (part.length > limit) chunks.push(...this.splitRecursively(part, limit, rest));
      current = part.length > limit ? '' : part;
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  }

  private withOverlap(parts: string[], overlap: number, limit: number): string[] {
    if (overlap <= 0 || parts.length <= 1) return parts;
    return parts.map((part, index) => {
      if (index === 0) return part;
      const previousTail = parts[index - 1].slice(-overlap).trim();
      const combined = `${previousTail} ${part}`.trim();
      return combined.length <= limit ? combined : combined.slice(combined.length - limit).trim();
    });
  }
}
