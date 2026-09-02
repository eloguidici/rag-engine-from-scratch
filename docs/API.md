# API Guide

This document is the fastest way to understand and exercise the HTTP surface of the RAG engine.

The application exposes interactive OpenAPI documentation through Swagger UI at:

```text
http://localhost:3000/docs
```

The examples below assume the API is running on `http://localhost:3000`.

## Start the API

```bash
cp .env.example .env
npm ci
npm run start:dev
```

At minimum, configure `OPENAI_API_KEY` in `.env` for the default embedding and generation adapters.

For durable local persistence, use Docker Compose and PostgreSQL + pgvector as described in the root README.

## Endpoint summary

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Basic service health check |
| `POST` | `/rag/documents` | Ingest inline text, Markdown, or HTML |
| `POST` | `/rag/documents/upload` | Upload and ingest text, Markdown, HTML, or PDF |
| `PUT` | `/rag/documents/:id` | Reindex a stable document id and create a new revision only when content changes |
| `DELETE` | `/rag/documents/:id` | Delete a document and its indexed chunks |
| `POST` | `/rag/query` | Retrieve evidence and generate a grounded answer with citations |

## 1. Health check

```bash
curl http://localhost:3000/health
```

Use this endpoint to verify that the NestJS application is reachable before exercising ingestion or query flows.

## 2. Ingest inline content

### Request

```bash
curl -X POST http://localhost:3000/rag/documents \
  -H "Content-Type: application/json" \
  -d '{
    "id": "architecture-notes",
    "title": "RAG Architecture Notes",
    "format": "markdown",
    "content": "# Retrieval\nHybrid retrieval combines semantic and lexical evidence.",
    "metadata": {
      "category": "architecture",
      "department": "engineering"
    }
  }'
```

### Request fields

| Field | Required | Notes |
| --- | --- | --- |
| `id` | No | Optional stable document id. A UUID is generated when omitted. |
| `title` | Yes | Non-empty document title. |
| `content` | Yes | Non-empty source content. |
| `format` | No | `text`, `markdown`, or `html`. Defaults to `text`. |
| `metadata` | No | Object containing string, number, or boolean values. |

### Response shape

```json
{
  "documentId": "architecture-notes",
  "chunksIndexed": 1,
  "version": 1,
  "duplicate": false
}
```

The ingestion pipeline normalizes the source, computes a SHA-256 content hash, evaluates the document revision, chunks the content, generates embeddings, replaces the indexed chunks for the stable document id, and persists the revision state.

If exactly the same normalized content is ingested again for the same document id, the response reports `duplicate: true` and `chunksIndexed: 0` rather than creating an unnecessary revision.

## 3. Upload a document file

Supported ingestion formats include plain text, Markdown, HTML, and PDF. The current HTTP upload limit is 10 MiB.

### Request

```bash
curl -X POST http://localhost:3000/rag/documents/upload \
  -F "file=@./architecture-notes.pdf" \
  -F "title=Architecture Notes" \
  -F "id=architecture-pdf" \
  -F 'metadata={"category":"architecture","department":"engineering"}'
```

`metadata` is a JSON string in the multipart request. Values must be primitive strings, numbers, or booleans.

The file extractor validates the upload and sends the extracted content through the same ingestion pipeline used by inline documents.

## 4. Reindex a document

Use a stable document id when source content changes.

```bash
curl -X PUT http://localhost:3000/rag/documents/architecture-notes \
  -H "Content-Type: application/json" \
  -d '{
    "title": "RAG Architecture Notes",
    "format": "markdown",
    "content": "# Retrieval\nHybrid retrieval combines semantic and lexical evidence. Reciprocal Rank Fusion can then combine rankings.",
    "metadata": {
      "category": "architecture"
    }
  }'
```

A changed content hash creates the next revision and replaces the indexed chunks for that document id. Unchanged content is detected as a duplicate.

## 5. Query indexed documents

### Request

```bash
curl -X POST http://localhost:3000/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How does hybrid retrieval work?",
    "topK": 5,
    "filters": {
      "category": "architecture"
    }
  }'
```

### Request fields

| Field | Required | Notes |
| --- | --- | --- |
| `question` | Yes | Non-empty natural-language question. |
| `topK` | No | Number of final retrieval results, from 1 to 20. The configured default is used when omitted. |
| `filters` | No | Exact-match metadata filters applied before final ranking. |

### Response shape

```json
{
  "answer": "Hybrid retrieval combines semantic and lexical evidence [S1].",
  "citations": [
    {
      "documentId": "architecture-notes",
      "chunkId": "architecture-notes:0",
      "title": "RAG Architecture Notes",
      "excerpt": "Hybrid retrieval combines semantic and lexical evidence.",
      "score": 0.93
    }
  ]
}
```

Citation entries correspond to the chunks actually supplied to the generation step. The exact answer text and scores depend on the configured providers and indexed corpus.

The runtime retrieval flow is:

```text
Question
  -> query embedding
  -> semantic candidates + BM25 lexical relevance
  -> weighted hybrid scoring
  -> Reciprocal Rank Fusion
  -> optional query-aware relevance reranker
  -> diversity / near-duplicate removal
  -> bounded context
  -> grounded generation
  -> answer + citations / refusal
```

See [RETRIEVAL.md](RETRIEVAL.md) for implementation details and [EVALUATION.md](EVALUATION.md) for the benchmark and ablation methodology.

## 6. Delete a document

```bash
curl -X DELETE http://localhost:3000/rag/documents/architecture-notes
```

Response shape:

```json
{
  "documentId": "architecture-notes",
  "deleted": true
}
```

When a document is deleted, its indexed chunks are removed. Revision state is also removed when the document existed.

## Validation and error envelope

The API uses a global NestJS validation pipe with these behaviors:

- unknown request fields are rejected;
- DTO values are transformed when applicable;
- required fields and numeric ranges are validated;
- multipart metadata must be valid JSON;
- metadata values must be strings, numbers, or booleans.

Errors are normalized into one HTTP envelope:

```json
{
  "statusCode": 400,
  "message": "metadata must be valid JSON",
  "path": "/rag/documents/upload",
  "timestamp": "2026-09-02T16:00:00.000Z"
}
```

Validation failures may return `message` as an array when more than one DTO rule fails.

Infrastructure/provider failures are translated before crossing the HTTP boundary rather than exposing raw provider-specific exceptions.

## Request correlation and observability

Every HTTP request receives or propagates an `x-request-id`. Structured HTTP logs include request id, method, path, status and duration.

For client-side troubleshooting, pass your own correlation id:

```bash
curl -X POST http://localhost:3000/rag/query \
  -H "Content-Type: application/json" \
  -H "x-request-id: demo-request-001" \
  -d '{"question":"How does retrieval work?"}'
```

## Swagger / OpenAPI

Swagger UI is generated from the NestJS controllers and DTO metadata:

```text
http://localhost:3000/docs
```

It is useful for inspecting schemas and issuing requests without writing `curl` commands. Multipart upload is also described in the OpenAPI contract.

For architectural rationale rather than transport details, start with:

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [DECISIONS.md](DECISIONS.md)
- [RETRIEVAL.md](RETRIEVAL.md)
- [EVALUATION.md](EVALUATION.md)
- [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md)
