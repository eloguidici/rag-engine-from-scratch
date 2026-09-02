export const DOCUMENT_REVISION_REPOSITORY = Symbol('DOCUMENT_REVISION_REPOSITORY');

export interface DocumentRevisionState {
  contentHash: string;
  version: number;
}

export interface DocumentRevisionRepository {
  get(documentId: string): Promise<DocumentRevisionState | undefined>;
  save(documentId: string, state: DocumentRevisionState): Promise<void>;
  delete(documentId: string): Promise<void>;
}
