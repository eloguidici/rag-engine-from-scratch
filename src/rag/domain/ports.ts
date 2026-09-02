import { EmbeddedChunk, SearchHit } from './models';

export const EMBEDDING_PROVIDER = Symbol('EMBEDDING_PROVIDER');
export const VECTOR_STORE = Symbol('VECTOR_STORE');
export const GENERATION_PROVIDER = Symbol('GENERATION_PROVIDER');

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}

export interface VectorStore {
  upsert(chunks: EmbeddedChunk[]): Promise<void>;
  deleteByDocumentId(documentId: string): Promise<void>;
  semanticSearch(queryVector: number[], topK: number): Promise<SearchHit[]>;
  all(): Promise<EmbeddedChunk[]>;
}

export interface GenerationProvider {
  generate(question: string, context: string): Promise<string>;
}
