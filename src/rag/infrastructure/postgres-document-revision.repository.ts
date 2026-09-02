import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import {
  DocumentRevisionRepository,
  DocumentRevisionState,
} from '../domain/document-revision.repository';
import { POSTGRES_POOL } from './postgres.tokens';

interface RevisionRow {
  content_hash: string;
  version: number;
}

@Injectable()
export class PostgresDocumentRevisionRepository
  implements DocumentRevisionRepository
{
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async get(documentId: string): Promise<DocumentRevisionState | undefined> {
    const result = await this.pool.query<RevisionRow>(
      `SELECT content_hash, version
         FROM rag_document_revisions
        WHERE document_id = $1`,
      [documentId],
    );
    const row = result.rows[0];
    return row
      ? { contentHash: row.content_hash, version: row.version }
      : undefined;
  }

  async save(documentId: string, state: DocumentRevisionState): Promise<void> {
    await this.pool.query(
      `INSERT INTO rag_document_revisions
         (document_id, content_hash, version, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (document_id) DO UPDATE SET
         content_hash = EXCLUDED.content_hash,
         version = EXCLUDED.version,
         updated_at = now()`,
      [documentId, state.contentHash, state.version],
    );
  }

  async delete(documentId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM rag_document_revisions WHERE document_id = $1',
      [documentId],
    );
  }
}
