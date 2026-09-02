# Engineering Notes

This document captures short, defensible explanations for the main engineering choices in the repository. It complements `ARCHITECTURE.md` and `DECISIONS.md` with concise trade-offs useful during technical review.

## Why PostgreSQL + pgvector?

PostgreSQL keeps document revision state and vector persistence in one operationally familiar datastore while pgvector adds cosine similarity search without introducing a second database. It is a strong fit for moderate-scale RAG systems where transactional metadata and vector search belong close together. A dedicated vector platform would become more attractive when scale, multi-region topology, indexing latency or specialized vector operations justify the additional operational surface.

## Why hybrid retrieval?

Semantic similarity is strong for conceptual matches but can miss exact identifiers, names and domain terminology. BM25 complements embeddings with lexical relevance. Keeping both signals visible and fusing their rankings makes retrieval more robust than relying on a single score.

## Why Reciprocal Rank Fusion after weighted scoring?

Weighted scoring produces an interpretable baseline from normalized semantic and lexical signals. Reciprocal Rank Fusion then reduces sensitivity to incompatible raw score distributions by operating on rank positions. They solve related but distinct problems, so they remain separate stages.

## Why CQRS?

CQRS is used where command/query separation clarifies the application boundary: document ingestion/deletion mutate state while RAG queries read and orchestrate retrieval/generation. It is not used as a reason to create unnecessary abstractions for every method.

## Why ports and adapters?

The application layer should depend on capabilities such as embedding, generation, persistence and retrieval rather than vendor SDKs. Ports keep provider-specific behavior in infrastructure and make deterministic in-memory tests possible.

## Why both in-memory and PostgreSQL persistence?

The in-memory adapters provide fast deterministic tests and make the mechanics easy to inspect. PostgreSQL + pgvector proves the same application contracts against durable infrastructure. The dual implementation also demonstrates that persistence is replaceable without changing use cases.

## Why explicit document revisions and hashes?

Stable document ids and SHA-256 content hashes let ingestion distinguish duplicate content from genuine updates. Revision state is stored separately from vector chunks because lifecycle/version information has different semantics from retrieval data.

## Why bounded context?

Retrieval should not translate into unbounded prompt growth. A fixed context budget controls cost and latency, limits irrelevant evidence and makes behavior easier to reason about under load.

## Why treat retrieved content as untrusted?

Documents can contain instructions that were never intended to control the generation model. Retrieved text therefore crosses a trust boundary: it is evidence, not authority. The generation contract explicitly instructs the model to ignore instructions embedded in retrieved data.

## Why deterministic retrieval evaluation?

Recall@K, MRR and nDCG@K measure retrieval independently from answer generation. This separation makes regressions easier to diagnose and avoids hiding retrieval failures behind a fluent generated answer.

## Why not add a large orchestration framework?

The repository exists to expose RAG mechanics and architectural decisions. Adding a framework that owns retrieval, memory or orchestration would hide precisely the behavior the project is intended to demonstrate.

## What would change at larger scale?

Likely next steps include queue-backed asynchronous ingestion, transactional/staged reindexing, tenant-aware indexes and authorization, embedding schema/version metadata, stronger bulkhead/circuit-breaker policies, distributed tracing/metrics, PII controls and capacity-driven database/index tuning.

## Review summary

The design optimizes for explicit behavior, replaceable infrastructure, measurable retrieval quality, bounded generation, secure trust boundaries and a small operational surface. The important trade-off is deliberate: this repository favors clarity and defensibility over maximizing framework abstraction or infrastructure breadth.
