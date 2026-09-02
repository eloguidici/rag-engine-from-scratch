# Production Readiness Notes

This repository keeps the core RAG mechanics explicit while demonstrating the infrastructure boundaries required to operate the same architecture under production constraints.

## Implemented

- CQRS separation between ingestion mutations and RAG queries.
- Provider ports for embeddings, generation, vector persistence and revision persistence.
- In-memory persistence for deterministic development.
- PostgreSQL + pgvector persistence for chunks, embeddings and document revisions.
- HNSW cosine index plus document-id and JSONB metadata indexes.
- Real pgvector integration tests in GitHub Actions.
- BM25 + semantic hybrid retrieval.
- Reciprocal Rank Fusion and diversity reranking.
- Exact-match metadata filtering.
- Bounded generation context and exact source citations.
- Prompt-injection-aware generation instructions.
- Global request validation and consistent HTTP error responses.
- Health endpoint.
- Request correlation id and structured HTTP latency logs.
- Configurable OpenAI timeout and retry limits.
- Deterministic retrieval evaluation metrics: Recall@K, MRR and nDCG@K.
- CI quality gate covering lint, tests, pgvector integration and build.

## Persistence boundary

`RAG_PERSISTENCE=memory` keeps state local to the process. `RAG_PERSISTENCE=postgres` uses PostgreSQL/pgvector without changing application use cases.

A larger production deployment should additionally consider:

- explicit database migrations instead of only bootstrap SQL;
- transactional/staged replacement for highly concurrent reindexing;
- tenant-aware database policies and indexes;
- embedding schema/version metadata for model migrations;
- batched ingestion and connection-pool tuning based on load testing.

## Reliability

Implemented baseline:

- bounded provider request timeout;
- configurable provider retries;
- explicit provider-error translation;
- bounded upload and generation context sizes.

Deployment-specific extensions:

- circuit breaking when repeated upstream failures justify it;
- bulkheading/concurrency limits for ingestion;
- idempotency keys for externally retried ingestion requests;
- dead-letter handling for queue-backed ingestion.

A circuit breaker is intentionally not hard-coded here because its useful state scope depends on deployment topology, replica count and the chosen resilience layer.

## Observability

Implemented baseline:

- request correlation id;
- structured HTTP request log;
- HTTP status and request duration.

Useful production telemetry to export through the platform-standard stack:

- retrieval latency;
- embedding latency;
- generation latency;
- retrieved candidate count;
- selected context size;
- token usage and estimated model cost;
- zero-result query rate;
- upstream provider error rate;
- database pool saturation;
- document/tenant identifiers where safe.

OpenTelemetry and Prometheus exporters are deliberately left deployment-specific rather than adding an unused telemetry stack to the portfolio repository.

## Retrieval quality

Implemented deterministic metrics:

- Recall@K;
- MRR;
- nDCG@K.

The evaluation helpers are provider-independent and unit tested. A versioned representative dataset should be expanded as the target corpus becomes known.

Generation evaluation should remain separate and measure at least:

- groundedness;
- answer relevance;
- citation correctness;
- unsupported-claim rate.

## Security

Implemented boundaries include:

- strict DTO validation;
- unknown-field rejection;
- upload size limits;
- MIME validation;
- PDF signature validation;
- prompt-injection-aware retrieved-context handling;
- bounded context construction;
- no secrets committed to the repository.

Product-specific production deployments should add:

- authentication and authorization;
- tenant isolation;
- rate limiting;
- secrets management through the deployment platform;
- PII classification/redaction when required;
- audit logs for ingestion and destructive operations;
- malware/quarantine workflows for higher-risk document sources.

## Scaling path

The current architecture supports an incremental path:

1. synchronous ingestion for development/small workloads;
2. PostgreSQL + pgvector durable persistence;
3. queue-backed asynchronous ingestion;
4. batched embedding workers;
5. horizontal query API scaling;
6. caching where evaluation shows value;
7. dedicated reranking models for higher-value workloads.

The application layer should remain stable as these infrastructure adapters evolve.

## Portfolio boundary

This repository is intentionally production-minded, not marketed as a finished multi-tenant SaaS product. It now demonstrates the main engineering concerns useful in a technical review: architecture boundaries, durable vector persistence, revision lifecycle, retrieval quality measurement, CI integration testing, observability basics, provider failure controls and explicit security boundaries.
