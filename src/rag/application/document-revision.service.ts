import { Inject, Injectable } from '@nestjs/common';
import {
  DOCUMENT_REVISION_REPOSITORY,
  DocumentRevisionRepository,
} from '../domain/document-revision.repository';

export interface RevisionDecision {
  duplicate: boolean;
  version: number;
}

/** Coordinates duplicate detection and revision persistence. */
@Injectable()
export class DocumentRevisionService {
  constructor(
    @Inject(DOCUMENT_REVISION_REPOSITORY)
    private readonly repository: DocumentRevisionRepository,
  ) {}

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
