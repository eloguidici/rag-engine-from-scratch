# Architecture

## Objective

This project implements a Retrieval-Augmented Generation pipeline while keeping the core mechanics explicit, testable, and replaceable.

The architecture is organized around four layers:

- **API**: HTTP transport, validation, Swagger contracts, multipart upload, and CQRS dispatch.
- **Application**: use-case orchestration, document lifecycle, commands, queries, handlers, and retrieval flow.
- **Domain**: stable models, provider ports, and strategy contracts.
- **Infrastructure**: OpenAI adapters, vector storage, document extraction, chunking, BM25, RRF, and reranking implementations.

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

Infrastructure implements contracts defined toward the domain/application boundary. External provider details do not leak into use-case orchestration.

## Document ingestion boundary

Documents can enter through JSON content or multipart file upload.

```text
Inline content ───────────────┐
                             ├─> normalization -> revision hash -> chunking -> embeddings -> VectorStore
TXT / MD / HTML upload ──────┤
PDF upload -> text extraction ┘
```

`DocumentFileExtractor` owns binary extraction and MIME-specific behavior. `DocumentLoader` implementations normalize text, Markdown, and HTML. This keeps file transport and parser concerns outside `RagService`.

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

The system isolates the main change axes behind explicit contracts:

- `EmbeddingProvider`
- `GenerationProvider`
- `VectorStore`
- `DocumentFileExtractor`
- `ChunkingStrategy`
- `RetrievalScoringStrategy`
- `RetrievalFusionStrategy`
- `Reranker`

This keeps provider, storage, ingestion, and ranking replacement local to dependency registration.

## Chunking

`TextChunkerService` delegates to `ChunkingStrategy`.

The default `RecursiveChunkingStrategy` uses both character and approximate token budgets and prefers boundaries in this order:

1. paragraphs
2. sentences
3. whitespace
4. hard boundary fallback

Configurable overlap is preserved between chunks.

## Retrieval flow

`RetrievalService` coordinates retrieval without owning every ranking policy.

The default path is:

1. embed the query;
2. generate a semantic candidate pool;
3. apply exact metadata filters;
4. compute normalized BM25 lexical evidence;
5. combine semantic and lexical scores;
6. apply a score threshold;
7. fuse independent rankings with Reciprocal Rank Fusion;
8. apply deterministic diversity reranking;
9. return the final evidence set.

The diversity reranker removes near-duplicate chunks and limits repeated evidence from the same document.

## Vector storage

The current vector store is in-memory and calculates cosine similarity directly. It also supports deletion by stable document id so reindex and delete lifecycle behavior is exercised through the same port expected from a persistent adapter.

`VectorStore` is the boundary for the next persistence stage, such as PostgreSQL + pgvector.

## Context and grounding

`ContextBuilderService` owns source labeling, citation projection, and a bounded generation context.

Retrieved content is treated as untrusted data. The generation adapter is instructed to ignore instructions embedded inside documents, answer only from supplied evidence, and cite source identifiers such as `[S1]` and `[S2]`.

## File upload security boundary

Multipart upload currently accepts text, Markdown, HTML, and PDF documents up to 10 MB.

The upload path applies:

- MIME allowlisting;
- empty-file rejection;
- PDF signature validation;
- readable-text validation;
- primitive-only metadata validation;
- bounded in-memory upload size.

PDF parsing is isolated in infrastructure and the parser is explicitly destroyed after extraction.

## Design principles

Patterns and abstractions are introduced only when they address a concrete change axis:

- provider replacement -> Ports and Adapters
- ranking replacement -> Strategy Pattern
- chunking replacement -> Strategy Pattern
- read/write separation -> CQRS
- vendor isolation -> Dependency Inversion
- isolated responsibilities -> SOLID / SRP

The architecture intentionally avoids abstraction for abstraction's sake.

## Production evolution

The next logical production steps are:

1. PostgreSQL + pgvector persistence
2. durable document/revision state
3. database-level metadata filtering
4. retrieval evaluation datasets and metrics
5. groundedness/citation evaluation
6. structured metrics and distributed tracing
7. provider retry, backoff and circuit-breaker policies
8. asynchronous ingestion for large corpora
9. authentication, authorization and tenant isolation
10. horizontal query scaling and caching
