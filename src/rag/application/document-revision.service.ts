import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  DOCUMENT_REVISION_REPOSITORY,
  DocumentRevisionRepository,
} from '../domain/document-revision.repository';
import { InMemoryDocumentRevisionRepository } from '../infrastructure/in-memory-document-revision.repository';

export interface RevisionDecision {
  duplicate: boolean;
  version: number;
}

/** Coordinates duplicate detection and revision persistence. */
@Injectable()
export class DocumentRevisionService {
  private readonly repository: DocumentRevisionRepository;

  constructor(
    @Optional()
    @Inject(DOCUMENT_REVISION_REPOSITORY)
    repository?: DocumentRevisionRepository,
  ) {
    this.repository = repository ?? new InMemoryDocumentRevisionRepository();
  }

  async evaluate(documentId: string, contentHash: string): Promise<RevisionDecision> {
    const current = await this.repository.get(documentId);
    if (current?.contentHash === contentHash) {
      return { duplicate: true, version: current.version };
    }

    return {
      duplicate: false,
      version: current ? current.version + 1 : 1,
    };
  }

  commit(documentId: string, contentHash: string, version: number): Promise<void> {
    return this.repository.save(documentId, { contentHash, version });
  }

  remove(documentId: string): Promise<void> {
    return this.repository.delete(documentId);
  }
}
