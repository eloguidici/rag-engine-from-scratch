import { Chunk, SourceDocument } from './models';

export const CHUNKING_STRATEGY = Symbol('CHUNKING_STRATEGY');

export interface ChunkingOptions {
  maxCharacters: number;
  overlapCharacters: number;
  estimatedMaxTokens: number;
}

/** Splits normalized source content into retrieval-ready chunks. */
export interface ChunkingStrategy {
  chunk(document: SourceDocument, options: ChunkingOptions): Chunk[];
}
