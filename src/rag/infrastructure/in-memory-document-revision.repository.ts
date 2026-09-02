import {
  DocumentRevisionRepository,
  DocumentRevisionState,
} from '../domain/document-revision.repository';

export class InMemoryDocumentRevisionRepository implements DocumentRevisionRepository {
  private readonly revisions = new Map<string, DocumentRevisionState>();

  get(documentId: string): Promise<DocumentRevisionState | undefined> {
    return Promise.resolve(this.revisions.get(documentId));
  }

  save(documentId: string, state: DocumentRevisionState): Promise<void> {
    this.revisions.set(documentId, state);
    return Promise.resolve();
  }

  delete(documentId: string): Promise<void> {
    this.revisions.delete(documentId);
    return Promise.resolve();
  }
}
