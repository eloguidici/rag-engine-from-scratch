import { Injectable } from '@nestjs/common';

interface RevisionState {
  contentHash: string;
  version: number;
}

export interface RevisionDecision {
  duplicate: boolean;
  version: number;
}

/** Tracks in-memory document revisions for duplicate detection and reindexing. */
@Injectable()
export class DocumentRevisionService {
  private readonly revisions = new Map<string, RevisionState>();

  evaluate(documentId: string, contentHash: string): RevisionDecision {
    const current = this.revisions.get(documentId);
    if (current?.contentHash === contentHash) {
      return { duplicate: true, version: current.version };
    }

    return {
      duplicate: false,
      version: current ? current.version + 1 : 1,
    };
  }

  commit(documentId: string, contentHash: string, version: number): void {
    this.revisions.set(documentId, { contentHash, version });
  }
}
