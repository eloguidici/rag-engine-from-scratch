# Engineering Decisions

This document records the main architectural decisions behind the project and the trade-offs they introduce.

## 1. Build the RAG pipeline from first principles

**Decision:** implement chunking, vector similarity, BM25, hybrid ranking, rank fusion, context construction, provider boundaries and document lifecycle directly instead of delegating them to a RAG framework.

**Why:** the purpose of the project is to keep retrieval behavior observable, testable and replaceable. Debugging retrieval quality is easier when candidate generation, scoring, fusion and final evidence selection are explicit.

**Trade-off:** more code must be maintained locally. In a delivery-focused product, a framework can still be a valid choice when its abstraction cost is lower than the implementation cost.

## 2. Use CQRS only where read/write responsibilities diverge

**Decision:** ingestion/reindex/delete are commands and question answering is a query.

**Why:** index mutations and query execution have different retry, consistency, scaling and observability characteristics.

**Trade-off:** CQRS adds classes and indirection, so it is intentionally not applied to internal methods that do not benefit from it.

## 3. Depend on ports rather than provider SDKs

**Decision:** application code depends on stable contracts such as `EmbeddingProvider`, `GenerationProvider`, `VectorStore` and `DocumentRevisionRepository`.

**Why:** model providers and storage engines change independently from use cases.

**Trade-off:** provider-specific capabilities must be intentionally surfaced through contracts instead of leaking into orchestration.

## 4. Keep both in-memory and PostgreSQL persistence adapters

**Decision:** preserve an in-memory adapter for deterministic development/tests and add PostgreSQL + pgvector adapters for durable storage.

**Why:** the in-memory implementation keeps vector mechanics easy to inspect, while PostgreSQL demonstrates the same application contracts operating with durable infrastructure.

**Trade-off:** two adapters must obey the same behavioral expectations. Integration tests against a real pgvector service reduce that risk.

## 5. Persist revision state independently from vectors

**Decision:** document revision state lives behind `DocumentRevisionRepository` rather than being inferred only from chunk rows.

**Why:** duplicate detection, versioning and vector persistence are separate responsibilities and evolve independently.

**Trade-off:** multi-resource lifecycle operations are not a single distributed transaction. A stricter production system may coordinate these writes transactionally or through idempotent workflow semantics.

## 6. Use BM25 plus semantic retrieval

**Decision:** calculate corpus-aware BM25 lexical relevance alongside embedding similarity.

**Why:** embeddings capture semantic similarity while BM25 preserves exact identifiers, acronyms, codes, names and domain terminology.

**Trade-off:** hybrid retrieval introduces tuning parameters and additional compute. Retrieval evaluation should determine whether both signals improve the target corpus.

## 7. Keep weighted scoring and rank fusion separate

**Decision:** use weighted semantic/BM25 scores for relevance diagnostics and thresholds, then apply Reciprocal Rank Fusion over independent rankings.

**Why:** weighted scores are useful for inspecting relevance magnitude, while RRF reduces sensitivity to incompatible score scales.

**Trade-off:** this is a multi-stage ranking pipeline. It must be evaluated against simpler baselines rather than assumed to be universally better.

## 8. Keep reranking as an explicit stage

**Decision:** run a deterministic diversity reranker after fusion.

**Why:** candidate relevance and final context composition are different problems. Removing near duplicates and limiting repeated evidence from one document improves context diversity without modifying retrieval logic.

**Production evolution:** a learned cross-encoder or model-based reranker can replace the deterministic implementation behind the same boundary.

## 9. Make chunking replaceable

**Decision:** `TextChunkerService` delegates to `ChunkingStrategy` instead of owning a fixed splitting algorithm.

**Why:** chunking strongly affects retrieval quality and needs to evolve independently.

The default strategy uses character and approximate token budgets and prefers paragraph/sentence/whitespace boundaries before hard cuts.

## 10. Normalize before hashing revisions

**Decision:** deduplication/versioning is based on normalized document content, not raw payload bytes.

**Why:** equivalent source representations should not create needless revisions because of formatting noise.

**Trade-off:** normalization decisions become part of document identity semantics and should remain stable or be explicitly versioned later.

## 11. Reindex by stable document id

**Decision:** changed content for a stable document id removes old chunks and replaces them with the new revision.

**Why:** stale chunks create contradictory evidence and hard-to-debug answers.

**Trade-off:** a highly concurrent production system may require stronger transaction/staging semantics around replacement operations.

## 12. Isolate binary extraction from document normalization

**Decision:** multipart/PDF extraction lives behind `DocumentFileExtractor`; normalized string content continues through the same ingestion pipeline.

**Why:** transport and parser concerns should not leak into retrieval orchestration.

## 13. Validate PDF files beyond MIME type

**Decision:** PDF uploads must have `application/pdf` MIME type and a valid `%PDF-` signature before parsing.

**Why:** MIME headers are client-controlled and cannot be treated as sufficient validation.

**Trade-off:** signature validation is only a first boundary; higher-risk systems may also require malware scanning, sandboxed parsing and object-storage quarantine.

## 14. Bound upload and generation memory use

**Decision:** uploaded files are capped at 10 MB and generated LLM context is bounded.

**Why:** unbounded payloads can create memory pressure, cost spikes and denial-of-service risk.

**Trade-off:** large corpora eventually need streaming or asynchronous ingestion rather than simply increasing limits.

## 15. Fail fast on embedding cardinality mismatch

**Decision:** ingestion verifies that the embedding provider returns exactly one vector per chunk.

**Why:** silently indexing mismatched vectors creates retrieval corruption that is difficult to diagnose later.

## 16. Treat retrieved content as untrusted data

**Decision:** generation instructions explicitly state that retrieved documents are evidence, not executable instructions.

**Why:** RAG introduces an indirect prompt-injection boundary because external documents may contain adversarial text.

**Trade-off:** prompt-level controls reduce risk but do not replace authorization boundaries and tool isolation in systems that can perform actions.

## 17. Evaluate retrieval independently from generation

**Decision:** implement deterministic Recall@K, MRR and nDCG@K helpers and keep LLM answer evaluation separate.

**Why:** retrieval regressions should be measurable without model-judge variance, cost or provider dependency.

**Trade-off:** generation quality still requires its own versioned dataset and evaluation policy.

## 18. Add minimal observability at the HTTP boundary

**Decision:** propagate/create a request correlation id and emit structured request latency logs.

**Why:** even a portfolio-sized service should make a request traceable without introducing a complete telemetry stack.

**Production evolution:** export traces and metrics through OpenTelemetry/Prometheus or the platform-standard observability backend.

## 19. Configure provider timeout and retries explicitly

**Decision:** OpenAI clients use configurable timeout and retry limits.

**Why:** upstream calls need bounded failure behavior and the policy should be visible in configuration.

**Trade-off:** a distributed circuit breaker is deliberately not implemented in this single-service portfolio repository; that concern is best chosen together with deployment topology and shared infrastructure.

## 20. Treat production readiness as an explicit boundary

The repository demonstrates durable storage, CI integration testing, retrieval evaluation, request correlation and provider resilience while deliberately stopping before authentication/tenant isolation, queue-backed ingestion, compliance-specific PII handling and a full distributed telemetry platform.
