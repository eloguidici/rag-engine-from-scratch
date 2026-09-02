CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_chunks (
  id text PRIMARY KEY,
  document_id text NOT NULL,
  chunk_index integer NOT NULL,
  text_content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rag_chunks_document_id_idx
  ON rag_chunks (document_id);

CREATE INDEX IF NOT EXISTS rag_chunks_metadata_gin_idx
  ON rag_chunks USING gin (metadata);

CREATE INDEX IF NOT EXISTS rag_chunks_embedding_hnsw_idx
  ON rag_chunks USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS rag_document_revisions (
  document_id text PRIMARY KEY,
  content_hash text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
