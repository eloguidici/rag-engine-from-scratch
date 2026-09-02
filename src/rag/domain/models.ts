export type DocumentMetadata = Record<string, string | number | boolean>;

export interface SourceDocument {
  id: string;
  title: string;
  content: string;
  metadata?: DocumentMetadata;
}

export interface Chunk {
  id: string;
  documentId: string;
  text: string;
  index: number;
  metadata: DocumentMetadata;
}

export interface EmbeddedChunk extends Chunk {
  vector: number[];
}

export interface SearchHit {
  chunk: Chunk;
  semanticScore: number;
  keywordScore: number;
  score: number;
}

export interface RagAnswer {
  answer: string;
  citations: Array<{
    documentId: string;
    chunkId: string;
    title?: string;
    excerpt: string;
    score: number;
  }>;
}
