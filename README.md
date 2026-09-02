# RAG Engine From Scratch

A production-minded Retrieval-Augmented Generation engine built with NestJS and TypeScript from first principles, without LangChain or LlamaIndex.

The project keeps the important RAG mechanics explicit and replaceable: ingestion, normalization, chunking, embeddings, vector search, BM25, hybrid scoring, Reciprocal Rank Fusion, query-aware relevance reranking, diversity reranking, bounded context construction, generation, citations, file extraction, document revisions, persistence and evaluation.

## Repository guide

- [API guide and curl examples](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Architecture decisions](docs/DECISIONS.md)
- [Retrieval evaluation](docs/EVALUATION.md)
- [Production readiness](docs/PRODUCTION-READINESS.md)
- [Security policy](SECURITY.md)
- [Contributing workflow](CONTRIBUTING.md)
- [AI-assisted engineering workflow](AI-ENGINEERING.md)
- [Repository skills](ai/README.md)
- [Engineering notes and trade-offs](docs/ENGINEERING-NOTES.md)

## Why this project exists

RAG frameworks are useful, but they can hide the mechanics that matter when a system has to be debugged, evaluated, optimized, secured or adapted to production constraints. This implementation keeps those mechanics visible so each stage can be reasoned about, measured, replaced and tested independently.

## What this project demonstrates

This repository is intentionally designed as an architecture and engineering portfolio piece. It demonstrates:

- clean separation between API, application, domain and infrastructure concerns;
- CQRS where command/query separation adds clarity rather than ceremony;
- dependency inversion through ports and replaceable adapters;
- hybrid semantic + lexical retrieval, Reciprocal Rank Fusion and optional query-aware relevance reranking;
- durable PostgreSQL + pgvector persistence alongside deterministic in-memory adapters;
- document versioning, duplicate detection and stable re-indexing behavior;
- bounded, citation-aware generation with retrieved context treated as untrusted input;
- deterministic retrieval evaluation with Recall@K, MRR and nDCG@K;
- reproducible ablation benchmarks across BM25, dense, hybrid and hybrid + RRF pipelines;
- deterministic citation precision/coverage and insufficient-context refusal checks;
- production-minded observability, provider timeouts/retries and fail-fast configuration;
- reproducible dependency installation through a committed lockfile and `npm ci`;
- CI that validates production dependency security, lint, tests, retrieval benchmarks, build and real PostgreSQL/pgvector integration behavior.

The goal is not to imitate a full SaaS platform. It is to make the engineering decisions behind a serious RAG backend visible, testable and defensible in a technical review.

## Architecture

```mermaid
flowchart LR
    A[Inline content / upload] --> B[Loader / extractor]
    B --> C[Normalization + revision hash]
    C --> D[Chunking strategy]
    D --> E[Embedding provider]
    E --> V[VectorStore port]
    V --> M[In-memory adapter]
    V --> P[PostgreSQL + pgvector]

    Q[Question] --> QE[Query embedding]
    QE --> SS[Semantic search]
    Q --> BM25[BM25]
    SS --> HS[Weighted hybrid scoring]
    BM25 --> HS
    HS --> RRF[Reciprocal Rank Fusion]
    RRF --> SR[Optional relevance reranker]
    SR --> RR[Diversity / dedupe reranker]
    RR --> CB[Bounded context]
    CB --> LLM[Generation provider]
    LLM --> R[Answer + citations / refusal]
```

The application layer depends on ports rather than infrastructure implementations. Persistence and relevance reranking can be switched with configuration without changing the use cases.

## Implemented capabilities

- NestJS + TypeScript API with Swagger.
- CQRS separation for ingestion/delete commands and RAG queries.
- Recursive chunking with paragraph, sentence and whitespace boundaries.
- OpenAI embedding and generation adapters.
- In-memory vector store for deterministic local development/tests.
- PostgreSQL + pgvector vector-store adapter.
- Durable PostgreSQL document revision repository.
- Stable document ids, SHA-256 content hashes, versioning and duplicate detection.
- BM25 + semantic hybrid retrieval.
- Configurable candidate pool and relevance threshold.
- Reciprocal Rank Fusion.
- Optional query-aware relevance reranker behind a provider-agnostic port.
- Cohere rerank adapter with timeout, response validation and provider error translation.
- Diversity reranking and near-duplicate evidence removal.
- Exact-match metadata filtering.
- Bounded generation context.
- Source citations based on the exact chunks supplied to generation.
- Plain text, Markdown, HTML and PDF ingestion.
- Prompt-injection-aware generation boundary: retrieved content is untrusted data.
- Strict DTO validation and upload validation.
- Request correlation id and structured HTTP latency logs.
- Configurable OpenAI timeout and retry policy.
- Deterministic retrieval evaluation metrics: Recall@K, MRR and nDCG@K.
- Deterministic citation precision/coverage and refusal evaluation helpers.
- Reproducible retrieval ablation benchmark with p50/p95 latency reporting.
- GitHub Actions quality gate for audit, lint, tests, benchmark, build and real pgvector persistence tests.

## Project structure

```text
src/
├── common/
│   ├── filters/              # Consistent HTTP error envelopes
│   ├── health/               # Health endpoint
│   └── observability/        # Request correlation and structured HTTP logs
├── config/                   # Fail-fast environment validation
├── rag/
│   ├── api/                  # Controllers, DTOs and multipart transport
│   ├── application/          # Use cases, CQRS handlers and orchestration
│   ├── domain/               # Models, ports and strategy contracts
│   ├── evaluation/           # Retrieval/generation quality metrics + benchmark CLI
│   ├── infrastructure/       # Providers, pgvector, in-memory, PDF, BM25/RRF/reranking
│   └── rag.module.ts
├── app.module.ts
└── main.ts

database/
└── init.sql

docs/
├── API.md
├── ARCHITECTURE.md
├── DECISIONS.md
├── ENGINEERING-NOTES.md
├── EVALUATION.md
├── PRODUCTION-READINESS.md
└── RETRIEVAL.md

ai/
├── README.md
└── skills/

examples/
├── demo.sh
└── evaluation/
    ├── benchmark-dataset.json
    ├── benchmark-manifest.json
    └── retrieval-dataset.json
```

## Ingestion lifecycle

1. Receive inline content or an uploaded document.
2. Validate the source representation and upload type.
3. Extract PDF text when required.
4. Normalize text, Markdown or HTML.
5. Compute a stable SHA-256 content hash.
6. Detect duplicate revisions.
7. Increment the document version when content changes.
8. Split through the configured chunking strategy.
9. Generate embeddings for chunks.
10. Replace previous chunks for the stable document id.
11. Persist chunks through the configured `VectorStore` adapter.
12. Persist revision state through the configured revision repository.

When `RAG_PERSISTENCE=postgres`, chunks and revision state survive application restarts.

## Retrieval pipeline

1. Embed the question.
2. Retrieve a configurable semantic candidate pool.
3. Apply metadata filtering.
4. Compute BM25 lexical relevance.
5. Build weighted semantic + lexical scores.
6. Apply the configured minimum score.
7. Fuse rankings with Reciprocal Rank Fusion.
8. Optionally apply a query-aware relevance reranker.
9. Remove near-duplicate evidence and repeated chunks.
10. Build a bounded context.
11. Generate only from supplied evidence.
12. Return the selected chunks as citations or explicitly refuse when evidence is insufficient.

The weighted baseline is:

```text
hybridScore = semanticScore * 0.72 + bm25Score * 0.28
```

## Retrieval benchmark

The repository contains a deterministic, provider-independent ablation benchmark. Run it with:

```bash
npm run benchmark:retrieval
```

The current `v1` seed dataset produces the following reference result in CI:

| Pipeline | Recall@5 | MRR | nDCG@5 |
| --- | ---: | ---: | ---: |
| BM25 | 1.0000 | 1.0000 | 1.0000 |
| Dense proxy | 1.0000 | 0.8000 | 0.8524 |
| Hybrid | 1.0000 | 1.0000 | 1.0000 |
| Hybrid + RRF | 1.0000 | 0.9000 | 0.9262 |

The benchmark also reports p50 and p95 execution latency and records the dataset/configuration manifest. These numbers are intentionally **not** presented as universal model-quality claims: the built-in dense stage is a deterministic token-vector cosine proxy and the seed dataset is deliberately small. Its purpose is to make ranking changes measurable and to demonstrate ablation discipline without requiring an external model provider in CI.

Runtime semantic retrieval still uses the configured embedding provider. The optional relevance reranker can be evaluated separately against a representative corpus before its added latency and provider dependency are accepted.

## Persistence

Two persistence modes are available.

### In-memory

Useful for development, unit tests and understanding the mechanics. Data is process-local.

```env
RAG_PERSISTENCE=memory
```

### PostgreSQL + pgvector

Persists embeddings, chunk metadata and document revision state. The schema includes document-id and metadata indexes plus an HNSW cosine index for embeddings.

```env
RAG_PERSISTENCE=postgres
DATABASE_URL=postgresql://rag:rag@postgres:5432/rag
POSTGRES_POOL_MAX=10
```

Docker Compose starts the API and a pgvector-enabled PostgreSQL instance and initializes `database/init.sql`.

## Try the API

Interactive OpenAPI documentation is available through Swagger UI once the application is running:

```text
http://localhost:3000/docs
```

Swagger exposes the request schemas, validation constraints, multipart upload contract and executable operations for the RAG endpoints.

For copy/paste examples, expected response shapes, validation behavior, error envelopes and request-correlation examples, see **[docs/API.md](docs/API.md)**.

A quick manual path is:

```text
start API -> open /docs -> ingest a document -> query it -> inspect citations -> delete it
```

## Running locally

Requirements:

- Node.js 22+
- OpenAI API key

```bash
cp .env.example .env
npm ci
npm run start:dev
```

Swagger UI: `http://localhost:3000/docs`

Health: `GET /health`

## Docker with durable persistence

Set `OPENAI_API_KEY` in `.env`, then:

```bash
cp .env.example .env
# change RAG_PERSISTENCE=postgres
docker compose up --build
```

## Quick end-to-end demo

With the API running, execute:

```bash
bash examples/demo.sh
```

The script performs a health check, ingests a small document, asks a grounded question using a metadata filter, returns the answer with the retrieved citations, and deletes the demo document.

```bash
BASE_URL=http://localhost:3000 bash examples/demo.sh
```

## API examples

### Ingest content

```bash
curl -X POST http://localhost:3000/rag/documents \
  -H "Content-Type: application/json" \
  -d '{
    "id": "architecture-notes",
    "title": "RAG Architecture Notes",
    "format": "markdown",
    "content": "# Retrieval\nHybrid retrieval combines semantic and lexical evidence.",
    "metadata": { "category": "architecture" }
  }'
```

### Query

```bash
curl -X POST http://localhost:3000/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How does hybrid retrieval work?",
    "topK": 5,
    "filters": { "category": "architecture" }
  }'
```

### Delete

```bash
curl -X DELETE http://localhost:3000/rag/documents/architecture-notes
```

For the complete endpoint guide, file-upload example, response contracts and error behavior, see [docs/API.md](docs/API.md).

## Configuration

```env
PORT=3000
OPENAI_API_KEY=
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4.1-mini
OPENAI_TIMEOUT_MS=30000
OPENAI_MAX_RETRIES=2

RAG_PERSISTENCE=memory
DATABASE_URL=postgresql://rag:rag@postgres:5432/rag
POSTGRES_POOL_MAX=10

RAG_CHUNK_SIZE=900
RAG_CHUNK_OVERLAP=150
RAG_CHUNK_MAX_TOKENS=220
RAG_TOP_K=6
RAG_MAX_CONTEXT_CHARS=12000
RAG_CANDIDATE_MULTIPLIER=5
RAG_MIN_SCORE=0

RAG_RELEVANCE_RERANKER=none
COHERE_API_KEY=
COHERE_RERANK_MODEL=rerank-v3.5
RAG_RERANK_TIMEOUT_MS=10000
```

Critical configuration is validated before startup. The external relevance reranker is disabled by default and only introduces an external dependency when explicitly enabled.

## Evaluation

Retrieval-quality helpers implement Recall@K, Mean Reciprocal Rank (MRR) and nDCG@K. The metrics are deterministic, unit-tested and provider-independent. The benchmark compares retrieval variants rather than assuming additional stages improve ranking quality. See `docs/EVALUATION.md` and the versioned files under `examples/evaluation/` for the evaluation workflow and dataset format.

Generation-quality helpers separately measure citation precision, citation coverage and insufficient-context refusal behavior. Production evaluation should additionally measure groundedness, answer relevance and unsupported claims over a representative versioned dataset.

## Observability and provider resilience

Every HTTP request receives or propagates an `x-request-id`. Structured request logs include request id, method, path, HTTP status and duration.

OpenAI clients use configurable request timeout and retry limits. The optional Cohere relevance reranker also has a bounded timeout and validated response contract. Provider failures are translated into explicit domain errors rather than leaking provider-specific exceptions through the application layer.

## Testing and CI

Local quality commands:

```bash
npm ci
npm audit --omit=dev --audit-level=high
npm run lint
npm test -- --runInBand
npm run benchmark:retrieval
npm run test:cov
npm run build
```

The GitHub Actions pipeline validates reproducible installation from `package-lock.json`, audits production dependencies for high/critical vulnerabilities, runs lint, unit/integration tests, real PostgreSQL/pgvector persistence tests, the deterministic retrieval benchmark and the production build.

## Security boundaries

Retrieved documents are treated as untrusted data. The generation system prompt instructs the model to ignore instructions embedded in retrieved content and answer only from supplied evidence.

The API also applies strict DTO validation, unknown-field rejection, upload limits, MIME validation, PDF signature validation, bounded generation context and consistent error envelopes. See `SECURITY.md` for the repository security policy.

## Production boundary

This repository demonstrates the core engineering decisions behind a production-capable RAG service, but it is not presented as a complete multi-tenant SaaS platform.

Deliberately out of scope for this portfolio repository:

- authentication/authorization and tenant isolation;
- queue-backed asynchronous ingestion at large scale;
- distributed tracing exporter and metrics backend;
- circuit breaking across multiple application replicas;
- PII redaction and compliance-specific audit storage;
- automated LLM-as-a-judge generation scoring.

Those concerns are documented in `docs/PRODUCTION-READINESS.md` and can be added without replacing the application-layer contracts.

## Engineering philosophy

The implementation favors explicit behavior, small replaceable components, dependency inversion, deterministic boundaries and testability. Patterns are introduced only where they solve a concrete problem; the objective is not to maximize abstraction, but to make the system understandable and defensible in a technical review.

## License

MIT
