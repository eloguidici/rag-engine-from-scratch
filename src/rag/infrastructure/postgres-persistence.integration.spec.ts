import { Pool } from 'pg';
import { PostgresDocumentRevisionRepository } from './postgres-document-revision.repository';
import { PostgresVectorStore } from './postgres-vector-store';

const databaseUrl = process.env.TEST_DATABASE_URL ?? '';
const describeWithPostgres = databaseUrl ? describe : describe.skip;

describeWithPostgres('PostgreSQL/pgvector persistence', () => {
  let pool: Pool;
  let vectorStore: PostgresVectorStore;
  let revisions: PostgresDocumentRevisionRepository;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
    await pool.query('DROP TABLE IF EXISTS rag_chunks');
    await pool.query('DROP TABLE IF EXISTS rag_document_revisions');
    await pool.query(`
      CREATE TABLE rag_chunks (
        id text PRIMARY KEY,
        document_id text NOT NULL,
        chunk_index integer NOT NULL,
        text_content text NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        embedding vector(3) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE TABLE rag_document_revisions (
        document_id text PRIMARY KEY,
        content_hash text NOT NULL,
        version integer NOT NULL CHECK (version > 0),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    vectorStore = new PostgresVectorStore(pool);
    revisions = new PostgresDocumentRevisionRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE rag_chunks, rag_document_revisions');
  });

  it('persists chunks and retrieves them by cosine similarity', async () => {
    await vectorStore.upsert([
      {
        id: 'doc-a:0',
        documentId: 'doc-a',
        index: 0,
        text: 'hybrid retrieval combines semantic and lexical evidence',
        metadata: { category: 'architecture' },
        vector: [1, 0, 0],
      },
      {
        id: 'doc-b:0',
        documentId: 'doc-b',
        index: 0,
        text: 'unrelated finance notes',
        metadata: { category: 'finance' },
        vector: [0, 1, 0],
      },
    ]);

    const hits = await vectorStore.semanticSearch([0.99, 0.01, 0], 1);

    expect(hits).toHaveLength(1);
    expect(hits[0].chunk.documentId).toBe('doc-a');
    expect(hits[0].semanticScore).toBeGreaterThan(0.9);
    expect((await vectorStore.all())).toHaveLength(2);
  });

  it('persists revision state across repository instances and supports deletion', async () => {
    await revisions.save('doc-a', { contentHash: 'hash-v1', version: 1 });

    const secondRepository = new PostgresDocumentRevisionRepository(pool);
    expect(await secondRepository.get('doc-a')).toEqual({
      contentHash: 'hash-v1',
      version: 1,
    });

    await secondRepository.save('doc-a', { contentHash: 'hash-v2', version: 2 });
    expect(await revisions.get('doc-a')).toEqual({
      contentHash: 'hash-v2',
      version: 2,
    });

    await revisions.delete('doc-a');
    expect(await secondRepository.get('doc-a')).toBeUndefined();
  });

  it('deletes all chunks for a document without affecting other documents', async () => {
    await vectorStore.upsert([
      {
        id: 'doc-a:0',
        documentId: 'doc-a',
        index: 0,
        text: 'first',
        metadata: {},
        vector: [1, 0, 0],
      },
      {
        id: 'doc-a:1',
        documentId: 'doc-a',
        index: 1,
        text: 'second',
        metadata: {},
        vector: [1, 0, 0],
      },
      {
        id: 'doc-b:0',
        documentId: 'doc-b',
        index: 0,
        text: 'keep me',
        metadata: {},
        vector: [0, 1, 0],
      },
    ]);

    expect(await vectorStore.deleteByDocumentId('doc-a')).toBe(true);
    const remaining = await vectorStore.all();
    expect(remaining.map((chunk) => chunk.documentId)).toEqual(['doc-b']);
  });
});
