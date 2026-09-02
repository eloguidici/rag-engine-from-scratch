# Architecture

## Objective

This project implements a Retrieval-Augmented Generation pipeline while keeping the core mechanics explicit, testable, and replaceable.

The architecture is organized around four layers:

- **API**: transport concerns, validation, Swagger contracts, and CQRS dispatch.
- **Application**: use-case orchestration, commands, queries, handlers, and retrieval flow.
- **Domain**: stable models, ports, and strategy contracts.
- **Infrastructure**: vendor SDKs, vector storage, and concrete ranking implementations.

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

The domain does not depend on NestJS-specific infrastructure adapters or external AI SDKs. External providers implement domain-defined ports.

## CQRS boundary

Document ingestion mutates the retrieval index and is modeled as a command:

```text
IngestDocumentCommand → IngestDocumentHandler → RagService.ingest()
```

Question answering is read-only and is modeled as a query:

```text
AskRagQuery → AskRagHandler → RagService.query()
```

CQRS is intentionally limited to operations where the read/write distinction is meaningful.

## Ports

The application depends on three primary provider contracts:

- `EmbeddingProvider`
- `VectorStore`
- `GenerationProvider`

This makes provider replacement local to dependency registration.

## Retrieval Strategy

`RetrievalService` coordinates retrieval but does not own ranking policy. Ranking is delegated to `RetrievalScoringStrategy`.

The default implementation, `WeightedHybridScoringStrategy`, combines semantic similarity and lexical evidence.

This separation allows future implementations such as:

- Reciprocal Rank Fusion
- BM25 + vector fusion
- learned rerankers
- domain-specific weighting

without changing retrieval orchestration.

## Chunking

`TextChunkerService` currently uses character-based overlapping chunks with boundary preference for sentence or whitespace endings.

This is intentionally isolated because chunking strategy is one of the most important RAG tuning parameters. Future strategies can introduce token-aware, semantic, or structure-aware chunking.

## Vector storage

The initial vector store is in-memory and calculates cosine similarity directly. This makes the mathematical behavior inspectable and keeps the first implementation dependency-light.

The `VectorStore` port is the stable boundary for future adapters such as pgvector or Qdrant.

## Grounding

Generation receives only the retrieved context. The generation adapter is instructed to avoid unsupported claims and to use source identifiers such as `[S1]` and `[S2]`.

The API response also returns structured citations with document and chunk identifiers, excerpts, and ranking scores.

## Design principles

Patterns and abstractions are introduced only when they address a concrete change axis:

- provider replacement → Ports and Adapters
- ranking replacement → Strategy Pattern
- read/write separation → CQRS
- vendor isolation → Dependency Inversion
- isolated responsibilities → SOLID / SRP

The architecture intentionally avoids abstraction for abstraction's sake.

## Production evolution

The next logical production steps are:

1. persistent vector-store adapter
2. BM25 lexical index
3. Reciprocal Rank Fusion or reranker stage
4. metadata filtering
5. token-aware context budget
6. ingestion loaders and parsers
7. structured logs and tracing
8. retrieval and groundedness evaluation
9. resilience policies and rate limiting
10. security controls for multi-tenant corpora
