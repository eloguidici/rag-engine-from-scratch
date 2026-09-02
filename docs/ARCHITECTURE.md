# Architecture

## Objective

This project implements a Retrieval-Augmented Generation pipeline while keeping the core mechanics explicit, testable, measurable and replaceable.

The architecture is organized around four layers:

- **API**: HTTP transport, validation, Swagger contracts, multipart upload and CQRS dispatch.
- **Application**: use-case orchestration, document lifecycle, commands, queries, handlers and retrieval flow.
- **Domain**: stable models, provider ports and strategy contracts.
- **Infrastructure**: OpenAI, PostgreSQL/pgvector, in-memory storage, document extraction, chunking, BM25, RRF and reranking implementations.

## Dependency direction

```text
API
 ↓
Application
 ↓
Domain
 ↑
Infrastructure
```

Infrastructure implements contracts defined toward the domain/application boundary. External provider and database details do not leak into use-case orchestration.

## Ingestion boundary

```text
Inline content ───────────────┐
                             ├─> normalization -> revision hash -> chunking -> embeddings -> VectorStore
TXT / MD / HTML upload ──────┤
PDF upload -> text extraction ┘
```

A SHA-256 hash of normalized content drives duplicate detection and revisioning. Stable document ids support safe reindexing: unchanged content is skipped; changed content increments the version and replaces previous chunks.

## CQRS boundary

Index mutations are commands:

```text
IngestDocumentCommand -> IngestDocumentHandler -> RagService.ingest()
DeleteDocumentCommand -> DeleteDocumentHandler -> RagService.deleteDocument()
```

Question answering is read-only:

```text
AskRagQuery -> AskRagHandler -> RagService.query()
```

CQRS is intentionally limited to operations where the read/write distinction is meaningful.

## Ports and strategies

The main change axes are isolated behind explicit contracts:

- `EmbeddingProvider`
- `GenerationProvider`
- `VectorStore`
- `DocumentRevisionRepository`
- `DocumentFileExtractor`
- `ChunkingStrategy`
- `RetrievalScoringStrategy`
- `RetrievalFusionStrategy`
- `Reranker`

## Persistence

`VectorStore` and `DocumentRevisionRepository` each have two implementations.

```text
                   ┌─> InMemoryVectorStore
VectorStore ───────┤
                   └─> PostgresVectorStore ─> PostgreSQL + pgvector

DocumentRevisionRepository
                   ├─> InMemoryDocumentRevisionRepository
                   └─> PostgresDocumentRevisionRepository ─> PostgreSQL
```

`RAG_PERSISTENCE=memory` keeps development deterministic and process-local. `RAG_PERSISTENCE=postgres` persists embeddings, chunk metadata and revision state across application restarts.

The pgvector schema uses an HNSW cosine index plus document-id and JSONB metadata indexes. CI starts a real pgvector service and verifies upsert, semantic search, deletion and revision persistence.

## Chunking

`TextChunkerService` delegates to `ChunkingStrategy`. The default `RecursiveChunkingStrategy` uses character and approximate token budgets and prefers boundaries in this order:

1. paragraphs;
2. sentences;
3. whitespace;
4. hard boundary fallback.

## Retrieval flow

`RetrievalService` coordinates retrieval without owning every ranking policy.

1. embed the query;
2. generate a semantic candidate pool;
3. apply metadata filters;
4. compute normalized BM25 lexical evidence;
5. combine semantic and lexical scores;
6. apply a score threshold;
7. fuse independent rankings with Reciprocal Rank Fusion;
8. apply deterministic diversity reranking;
9. return the final evidence set.

The diversity reranker removes near-duplicate chunks and limits repeated evidence from the same document.

## Evaluation boundary

Retrieval quality is measured separately from generation quality. Deterministic helpers implement Recall@K, MRR and nDCG@K so changes to weights, chunking, embeddings or reranking can be compared against a versioned dataset.

Generation evaluation remains a separate concern because groundedness and citation correctness can require domain-specific assertions, human review or an explicitly chosen evaluator model.

## Context and grounding

`ContextBuilderService` owns source labeling, citation projection and a bounded generation context.

Retrieved content is treated as untrusted data. The generation adapter is instructed to ignore instructions embedded inside documents, answer only from supplied evidence and cite source identifiers such as `[S1]` and `[S2]`.

## Observability and reliability

A global interceptor propagates or creates `x-request-id` and emits structured HTTP logs containing request id, method, path, status and duration.

OpenAI adapters use explicit timeout and retry configuration. Provider-specific errors are wrapped behind application/domain error boundaries.

## File upload security boundary

Multipart upload accepts text, Markdown, HTML and PDF documents up to 10 MB and applies MIME allowlisting, empty-file rejection, PDF signature validation, readable-text validation, primitive-only metadata validation and a bounded in-memory upload size.

## Design principles

Patterns and abstractions are introduced only when they address a concrete change axis:

- provider replacement -> Ports and Adapters;
- storage replacement -> Ports and Adapters;
- ranking replacement -> Strategy Pattern;
- chunking replacement -> Strategy Pattern;
- read/write separation -> CQRS;
- vendor isolation -> Dependency Inversion;
- isolated responsibilities -> SOLID / SRP.

## Deliberate production boundary

The repository stops before becoming a complete multi-tenant platform. Authentication, tenant isolation, queue-backed ingestion, distributed tracing exporters, metrics backends, multi-replica circuit breaking and compliance-specific PII/audit features remain product/infrastructure concerns that can be added without replacing the core application contracts.
