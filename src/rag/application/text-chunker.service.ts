import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CHUNKING_STRATEGY,
  ChunkingStrategy,
} from '../domain/chunking-strategy';
import { Chunk, SourceDocument } from '../domain/models';

@Injectable()
export class TextChunkerService {
  constructor(
    private readonly config: ConfigService,
    @Inject(CHUNKING_STRATEGY) private readonly strategy: ChunkingStrategy,
  ) {}

  chunk(document: SourceDocument): Chunk[] {
    return this.strategy.chunk(document, {
      maxCharacters: Number(this.config.get('RAG_CHUNK_SIZE') ?? 900),
      overlapCharacters: Number(this.config.get('RAG_CHUNK_OVERLAP') ?? 150),
      estimatedMaxTokens: Number(this.config.get('RAG_CHUNK_MAX_TOKENS') ?? 220),
    });
  }
}
