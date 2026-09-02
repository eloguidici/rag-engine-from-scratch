# RAG Engine From Scratch

A production-minded Retrieval-Augmented Generation engine built with NestJS and TypeScript from first principles, without LangChain or LlamaIndex.

The project keeps the important RAG mechanics explicit and replaceable: ingestion, normalization, chunking, embeddings, vector search, BM25, hybrid scoring, Reciprocal Rank Fusion, reranking, bounded context construction, generation, citations, file extraction, document revisions, persistence and evaluation.

## Why this project exists

RAG frameworks are useful, but they can hide the mechanics that matter when a system has to be debugged, evaluated, optimized, secured or adapted to production constraints. This implementation keeps those mechanics visible so each stage can be reasoned about, measured, replaced and tested independently.

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
    RRF --> RR[Diversity reranker]
    RR --> CB[Bounded context]
    CB --> LLM[Generation provider]
    LLM --> R[Answer + citations]
```

The application layer depends on ports rather than infrastructure implementations. Persistence can be switched with configuration without changing the use cases.

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
- GitHub Actions quality gate for lint, tests, build and real pgvector persistence tests.

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
│   ├── evaluation/           # Retrieval-quality metrics
│   ├── infrastructure/       # OpenAI, pgvector, in-memory, PDF, BM25/RRF
│   └── rag.module.ts
├── app.module.ts
└── main.ts

database/
└── init.sql                  # pgvector schema and indexes

docs/
├── ARCHITECTURE.md
├── DECISIONS.md
├── EVALUATION.md
├── PRODUCTION-READINESS.md
└── RETRIEVAL.md
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
8. Remove near-duplicate evidence and repeated chunks.
9. Build a bounded context.
10. Generate only from supplied evidence.
11. Return the selected chunks as citations.

The weighted baseline is:

```text
hybridScore = semanticScore * 0.72 + bm25Score * 0.28
```

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

## Running locally

Requirements:

- Node.js 22+
- OpenAI API key

```bash
cp .env.example .env
npm install
npm run start:dev
```

Swagger UI:

```text
http://localhost:3000/docs
```

Health:

```text
GET /health
```

## Docker with durable persistence

Set `OPENAI_API_KEY` in `.env`, then:

```bash
cp .env.example .env
# change RAG_PERSISTENCE=postgres
docker compose up --build
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
```

Critical configuration is validated before startup.

## Evaluation

Retrieval-quality helpers implement:

- Recall@K
- Mean Reciprocal Rank (MRR)
- nDCG@K

The metrics are deterministic, unit-tested and provider-independent. See `docs/EVALUATION.md` and `examples/evaluation/retrieval-dataset.json` for the evaluation workflow and dataset format.

Generation evaluation remains intentionally separate so retrieval metrics are not conflated with LLM judging. A production dataset should additionally measure groundedness, answer relevance, citation correctness and unsupported claims.

## Observability and provider resilience

Every HTTP request receives or propagates an `x-request-id`. Structured request logs include request id, method, path, HTTP status and duration.

OpenAI clients use configurable request timeout and retry limits. Provider failures are translated into explicit domain errors rather than leaking SDK-specific exceptions through the application layer.

## Testing and CI

Local quality commands:

```bash
npm run lint
npm test -- --runInBand
npm run test:cov
npm run build
```

The GitHub Actions pipeline runs:

1. dependency installation;
2. lint;
3. unit and integration tests;
4. PostgreSQL/pgvector persistence tests against a real service container;
5. build.

The integration suite verifies pgvector upsert/search/delete behavior and durable document revision state.

## Security boundaries

Retrieved documents are treated as untrusted data. The generation system prompt instructs the model to ignore instructions embedded in retrieved content and answer only from supplied evidence.

The API also applies strict DTO validation, unknown-field rejection, upload limits, MIME validation, PDF signature validation, bounded generation context and consistent error envelopes.

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
