export const DOCUMENT_FILE_EXTRACTOR = Symbol('DOCUMENT_FILE_EXTRACTOR');

export interface UploadedDocumentFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface ExtractedDocumentFile {
  content: string;
  format: 'text' | 'markdown' | 'html';
  metadata: Record<string, string | number | boolean>;
}

/** Converts an uploaded binary file into text consumable by the ingestion pipeline. */
export interface DocumentFileExtractor {
  extract(file: UploadedDocumentFile): Promise<ExtractedDocumentFile>;
}
