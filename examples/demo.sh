#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

printf '\n1) Health check\n'
curl --fail --silent --show-error "${BASE_URL}/health"
printf '\n\n2) Ingest a document\n'
curl --fail --silent --show-error -X POST "${BASE_URL}/rag/documents" \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "portfolio-demo",
    "title": "RAG Portfolio Demo",
    "format": "markdown",
    "content": "# Hybrid retrieval\nHybrid retrieval combines semantic similarity with lexical BM25 evidence. Reciprocal Rank Fusion combines rankings before diversity reranking and bounded context construction.",
    "metadata": {
      "category": "demo",
      "source": "portfolio"
    }
  }'

printf '\n\n3) Ask a grounded question\n'
curl --fail --silent --show-error -X POST "${BASE_URL}/rag/query" \
  -H 'Content-Type: application/json' \
  -d '{
    "question": "What does hybrid retrieval combine?",
    "topK": 5,
    "filters": {
      "category": "demo"
    }
  }'

printf '\n\n4) Delete the demo document\n'
curl --fail --silent --show-error -X DELETE "${BASE_URL}/rag/documents/portfolio-demo"
printf '\n\nDemo completed.\n'
