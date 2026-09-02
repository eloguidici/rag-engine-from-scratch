# Engineering Decisions

This document records the main architectural decisions behind the project and the trade-offs they introduce.

## 1. Build the RAG pipeline from first principles

**Decision:** implement chunking, vector similarity, BM25, hybrid ranking, rank fusion, context construction, provider boundaries, and document lifecycle directly instead of delegating them to a RAG framework.

**Why:** the purpose of the project is to keep retrieval behavior observable, testable, and replaceable. Debugging retrieval quality is easier when candidate generation, scoring, fusion, and final evidence selection are explicit.

**Trade-off:** more code must be maintained locally. In a delivery-focused product, a framework can still be a valid choice when its abstraction cost is lower than the implementation cost.

## 2. Use CQRS only where read/write responsibilities diverge

**Decision:** ingestion/reindex/delete are commands and question answering is a query.

**Why:** index mutations and query execution have different retry, consistency, scaling, and observability characteristics.

**Trade-off:** CQRS adds classes and indirection, so it is intentionally not applied to internal methods that do not benefit from it.

## 3. Depend on ports rather than provider SDKs

**Decision:** application code depends on stable contracts such as `EmbeddingProvider`, `GenerationProvider`, `VectorStore`, and `DocumentFileExtractor`.

**Why:** model providers, storage engines, and parsers change independently from use cases.

**Trade-off:** provider-specific capabilities must be intentionally surfaced through contracts instead of being consumed directly.

## 4. Keep the first vector store in memory

**Decision:** use an in-memory adapter with explicit cosine similarity.

**Why:** it keeps retrieval mechanics visible and makes tests deterministic while the application model is still evolving.

**Production evolution:** replace it with PostgreSQL + pgvector or another durable vector store while preserving the `VectorStore` contract.

## 5. Use BM25 plus semantic retrieval

**Decision:** calculate corpus-aware BM25 lexical relevance alongside embedding similarity.

**Why:** embeddings capture semantic similarity while BM25 preserves exact identifiers, acronyms, codes, names, and domain terminology.

**Trade-off:** hybrid retrieval introduces tuning parameters and additional compute. Retrieval evaluation should determine whether both signals improve the target corpus.

## 6. Keep weighted scoring and rank fusion separate

**Decision:** use weighted semantic/BM25 scores for explicit relevance diagnostics and thresholds, then apply Reciprocal Rank Fusion over independent rankings.

**Why:** weighted scores are useful for inspecting relevance magnitude, while RRF reduces sensitivity to incompatible score scales.

**Trade-off:** this is a multi-stage ranking pipeline. It must be evaluated against simpler baselines rather than assumed to be universally better.

## 7. Keep reranking as an explicit stage

**Decision:** run a deterministic diversity reranker after fusion.

**Why:** candidate relevance and final context composition are different problems. Removing near duplicates and limiting repeated evidence from one document improves context diversity without modifying retrieval logic.

**Production evolution:** a learned cross-encoder or model-based reranker can replace the deterministic implementation behind the same boundary.

## 8. Make chunking replaceable

**Decision:** `TextChunkerService` delegates to `ChunkingStrategy` instead of owning a fixed splitting algorithm.

**Why:** chunking strongly affects retrieval quality and needs to evolve independently.

The default strategy uses character and approximate token budgets and prefers paragraph/sentence/whitespace boundaries before hard cuts.

## 9. Normalize before hashing revisions

**Decision:** deduplication/versioning is based on normalized document content, not raw payload bytes.

**Why:** equivalent source representations should not create needless revisions because of formatting noise.

**Trade-off:** normalization decisions become part of document identity semantics and should remain stable or be explicitly versioned later.

## 10. Reindex by stable document id

**Decision:** changed content for a stable document id removes old chunks and replaces them with the new revision.

**Why:** leaving stale chunks in the retrieval corpus creates contradictory evidence and hard-to-debug answers.

**Trade-off:** the current in-memory delete/upsert sequence is not transactional. A durable implementation should use transaction or staging semantics.

## 11. Isolate binary extraction from document normalization

**Decision:** multipart/PDF extraction lives behind `DocumentFileExtractor`; normalized string content continues through the same ingestion pipeline.

**Why:** transport and parser concerns should not leak into retrieval orchestration.

**Trade-off:** binary ingestion adds a second boundary to test and secure.

## 12. Validate PDF files beyond MIME type

**Decision:** PDF uploads must have `application/pdf` MIME type and a valid `%PDF-` signature before parsing.

**Why:** MIME headers are client-controlled and cannot be treated as sufficient validation.

**Trade-off:** signature validation is only a first boundary; production systems may also require malware scanning, sandboxed parsing, and object-storage quarantine.

## 13. Bound upload and generation memory use

**Decision:** uploaded files are capped at 10 MB and generated LLM context is bounded.

**Why:** unbounded payloads can create memory pressure, cost spikes, and denial-of-service risk.

**Trade-off:** large documents eventually need streaming or asynchronous ingestion rather than simply increasing limits.

## 14. Fail fast on embedding cardinality mismatch

**Decision:** ingestion verifies that the embedding provider returns exactly one vector per chunk.

**Why:** silently indexing mismatched vectors creates retrieval corruption that is difficult to diagnose later.

## 15. Treat retrieved content as untrusted data

**Decision:** generation instructions explicitly state that retrieved documents are evidence, not executable instructions.

**Why:** RAG introduces an indirect prompt-injection boundary because external documents may contain adversarial text.

**Trade-off:** prompt-level controls reduce risk but do not replace authorization boundaries, tool isolation, and content policies in systems that allow actions.

## 16. Normalize transport errors globally

**Decision:** use strict DTO validation and a global exception filter.

**Why:** API consumers receive a predictable error envelope while application/domain code remains independent from HTTP response formatting.

## 17. Treat production readiness as an evolution path

The current implementation is deliberately production-minded rather than labeled as a finished production platform. Persistence, distributed state, tenant isolation, asynchronous ingestion, observability, resilience, and evaluation are introduced as independent capabilities behind existing boundaries instead of expanding current services indefinitely.
