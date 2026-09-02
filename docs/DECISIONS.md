# Engineering Decisions

This document records the main architectural decisions behind the project and the trade-offs they introduce.

## 1. Build the RAG pipeline from first principles

**Decision:** implement chunking, vector similarity, lexical scoring, hybrid ranking, context construction and provider boundaries directly instead of delegating them to a RAG framework.

**Why:** the purpose of the project is to keep retrieval behavior observable, testable and replaceable. Debugging retrieval quality is easier when ranking and context construction are explicit.

**Trade-off:** more code must be maintained locally. In a delivery-focused product, a framework could still be a valid choice if its abstraction cost is lower than the implementation cost.

## 2. Use CQRS only at the application boundary

**Decision:** document ingestion is modeled as a command and question answering as a query.

**Why:** ingestion changes the retrieval index while querying is read-only and follows a different execution path. Their scaling, retry and observability requirements may diverge over time.

**Trade-off:** CQRS adds classes and indirection. It is intentionally not used for every internal method because doing so would add ceremony without improving the design.

## 3. Depend on ports rather than provider SDKs

**Decision:** application services depend on `EmbeddingProvider`, `GenerationProvider`, `VectorStore` and `RetrievalScoringStrategy` contracts.

**Why:** model providers and storage technologies change frequently. Stable domain-facing contracts keep vendor-specific concerns in infrastructure adapters.

**Trade-off:** provider-specific capabilities must be intentionally surfaced through the contracts instead of being consumed directly.

## 4. Keep the first vector store in memory

**Decision:** use an in-memory adapter with an explicit cosine-similarity implementation.

**Why:** it keeps the retrieval mechanics visible and makes tests deterministic. Persistence is an infrastructure concern and should not influence the first version of the application model.

**Production evolution:** replace the adapter with pgvector, Qdrant, Weaviate or another persistent store while preserving the `VectorStore` port.

## 5. Use hybrid retrieval

**Decision:** combine semantic similarity with lexical evidence through a strategy.

**Why:** embeddings are strong at semantic similarity, while lexical matching protects exact identifiers, codes, acronyms and domain-specific terms.

**Trade-off:** the current weighted scorer is intentionally simple. Larger corpora should evaluate BM25, Reciprocal Rank Fusion and learned rerankers against a retrieval dataset.

## 6. Separate context construction from orchestration

**Decision:** `ContextBuilderService` owns source labeling and citation projection; `RagService` only coordinates the use case.

**Why:** context formatting changes independently from retrieval and generation. Isolating it improves SRP, testability and future token-budget controls.

## 7. Fail fast on embedding cardinality mismatch

**Decision:** ingestion verifies that the embedding provider returns exactly one vector per chunk.

**Why:** silently indexing mismatched vectors creates retrieval corruption that is difficult to diagnose later.

## 8. Normalize transport errors globally

**Decision:** use a global exception filter and strict DTO validation.

**Why:** API consumers receive a predictable error envelope while application and domain code remain independent from HTTP response formatting.

## 9. Treat production readiness as an evolution path

The current implementation is intentionally compact. Production-oriented extensions should be added behind existing boundaries rather than by expanding responsibilities inside current services.

Expected next steps include persistent vector storage, document parsers, metadata filters, token-aware chunking, reranking, structured telemetry, resilience policies and retrieval evaluation datasets.
