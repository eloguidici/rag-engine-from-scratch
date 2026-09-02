# Production Readiness Notes

This repository keeps the core retrieval mechanics explicit, while documenting the changes required to operate the same architecture under production load.

## Already implemented

- CQRS separation between ingestion and queries.
- Provider ports for embeddings, generation, vector persistence, and ranking.
- BM25 + semantic hybrid retrieval.
- Exact-match metadata filtering.
- Bounded generation context.
- Source citations derived from the exact selected chunks.
- Prompt-injection-aware generation instructions.
- Global request validation and consistent HTTP error responses.
- Health endpoint.
- Unit tests for chunking, vector similarity, context construction, and hybrid scoring.
- CI quality gate covering lint, tests, and build.

## Production adapters

The current in-memory vector store is intentionally transparent. A production deployment should replace it with a durable adapter such as PostgreSQL/pgvector or Qdrant while preserving the `VectorStore` port.

A production adapter should support:

- transactional or idempotent upserts;
- metadata indexes;
- tenant-aware filtering;
- batched embedding ingestion;
- deletion and re-indexing by document id;
- schema/version metadata for embedding migrations.

## Reliability

Recommended extensions:

- timeout and retry policies around external model providers;
- exponential backoff with jitter;
- circuit breaking for repeated upstream failures;
- bulkheading/concurrency limits for ingestion;
- idempotency keys for ingestion requests;
- dead-letter handling for asynchronous ingestion pipelines.

## Observability

Recommended telemetry:

- request correlation id;
- retrieval latency;
- embedding latency;
- generation latency;
- retrieved candidate count;
- selected context size;
- token usage and estimated model cost;
- zero-result query rate;
- upstream provider error rate;
- structured logs with document and tenant identifiers where safe.

## Retrieval quality

A production evaluation suite should measure retrieval and generation separately.

Retrieval metrics:

- Recall@K
- Precision@K
- MRR
- nDCG

Generation metrics:

- groundedness;
- answer relevance;
- citation correctness;
- unsupported-claim rate.

Evaluation datasets should be versioned alongside retrieval configuration so ranking changes can be compared before deployment.

## Security

Production deployments should add:

- authentication and authorization;
- tenant isolation;
- rate limiting;
- request-size limits;
- document type and MIME validation;
- secrets management outside environment files;
- PII classification/redaction when required;
- audit logs for ingestion and destructive operations;
- explicit trust boundaries for retrieved content.

Retrieved documents must always be treated as untrusted data. They must never be allowed to redefine system behavior or authorize tool execution.

## Scaling path

A practical evolution path is:

1. synchronous ingestion for development;
2. durable vector adapter;
3. queue-backed asynchronous ingestion;
4. batched embedding workers;
5. horizontal query API scaling;
6. cached embeddings/query results where appropriate;
7. dedicated reranking models for higher-value workloads.

The application layer should remain unchanged as these infrastructure adapters evolve.
