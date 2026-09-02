import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { DocumentMetadata, EmbeddedChunk, SearchHit } from '../domain/models';
import { VectorStore } from '../domain/ports';
import { POSTGRES_POOL } from './postgres.tokens';

interface ChunkRow {
  id: string;
  document_id: string;
  chunk_index: number;
  text_content: string;
  metadata: DocumentMetadata;
  embedding: string;
}

interface SearchRow extends ChunkRow {
  semantic_score: number | string;
}

/** PostgreSQL/pgvector implementation of the vector-store port. */
@Injectable()
export class PostgresVectorStore implements VectorStore {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async upsert(chunks: EmbeddedChunk[]): Promise<void> {
    if (chunks.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const chunk of chunks) {
        await client.query(
          `INSERT INTO rag_chunks
            (id, document_id, chunk_index, text_content, metadata, embedding)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6::vector)
           ON CONFLICT (id) DO UPDATE SET
             document_id = EXCLUDED.document_id,
             chunk_index = EXCLUDED.chunk_index,
             text_content = EXCLUDED.text_content,
             metadata = EXCLUDED.metadata,
             embedding = EXCLUDED.embedding`,
          [
            chunk.id,
            chunk.documentId,
            chunk.index,
            chunk.text,
            JSON.stringify(chunk.metadata),
            this.vectorLiteral(chunk.vector),
          ],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteByDocumentId(documentId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM rag_chunks WHERE document_id = $1',
      [documentId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async all(): Promise<EmbeddedChunk[]> {
    const result = await this.pool.query<ChunkRow>(
      `SELECT id, document_id, chunk_index, text_content, metadata,
              embedding::text AS embedding
         FROM rag_chunks`,
    );
    return result.rows.map((row) => this.mapChunk(row));
  }

  async semanticSearch(queryVector: number[], topK: number): Promise<SearchHit[]> {
    if (queryVector.length === 0 || topK <= 0) return [];

    const result = await this.pool.query<SearchRow>(
      `SELECT id, document_id, chunk_index, text_content, metadata,
              embedding::text AS embedding,
              1 - (embedding <=> $1::vector) AS semantic_score
         FROM rag_chunks
        ORDER BY embedding <=> $1::vector
        LIMIT $2`,
      [this.vectorLiteral(queryVector), topK],
    );

    return result.rows.map((row) => ({
      chunk: this.mapChunk(row),
      semanticScore: Number(row.semantic_score),
      keywordScore: 0,
      score: 0,
    }));
  }

  private mapChunk(row: ChunkRow): EmbeddedChunk {
    return {
      id: row.id,
      documentId: row.document_id,
      index: row.chunk_index,
      text: row.text_content,
      metadata: row.metadata,
      vector: this.parseVector(row.embedding),
    };
  }

  private vectorLiteral(vector: number[]): string {
    return `[${vector.join(',')}]`;
  }

  private parseVector(value: string): number[] {
    const trimmed = value.trim();
    if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return [];
    const body = trimmed.slice(1, -1);
    if (!body) return [];
    return body.split(',').map((item) => Number(item));
  }
}
