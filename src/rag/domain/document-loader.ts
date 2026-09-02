import { DocumentMetadata, SourceDocument } from './models';

export type DocumentFormat = 'text' | 'markdown' | 'html';

export interface LoadDocumentInput {
  id: string;
  title: string;
  content: string;
  format: DocumentFormat;
  metadata?: DocumentMetadata;
}

/** Converts an external document representation into normalized source text. */
export interface DocumentLoader {
  supports(format: DocumentFormat): boolean;
  load(input: LoadDocumentInput): SourceDocument;
}
