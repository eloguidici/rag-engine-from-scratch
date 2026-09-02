# Retrieval Evaluation

The repository includes deterministic retrieval metrics so ranking changes can be compared instead of judged only by anecdotal queries.

## Metrics

Implemented in `src/rag/evaluation/retrieval-metrics.ts`:

- `Recall@K`: fraction of relevant documents present in the first K results.
- `MRR`: reciprocal rank of the first relevant result, averaged across the dataset.
- `nDCG@K`: rank-sensitive relevance quality normalized against the ideal ordering.

The metric implementation is covered by unit tests and has no model/provider dependency.

## Ablation benchmark

Run:

```bash
npm run benchmark:retrieval
```

The deterministic benchmark compares four retrieval configurations against the same versioned corpus:

1. BM25 lexical ranking;
2. deterministic dense-ranking proxy;
3. weighted dense + BM25 hybrid scoring;
4. hybrid scoring followed by Reciprocal Rank Fusion.

For each pipeline it reports Recall@5, MRR, nDCG@5, p50 latency and p95 latency. The command also prints a JSON manifest containing the dataset version and ranking configuration so benchmark runs remain reproducible.

The built-in dense score intentionally uses a deterministic token-vector cosine proxy. It is a regression and ablation benchmark for repository ranking logic, not a claim about a particular embedding model. Provider-specific benchmarks should pin the embedding/reranking model and dataset version separately.

The benchmark corpus lives in `examples/evaluation/benchmark-dataset.json` and CI executes the benchmark on every change.

## Optional query-aware reranking

Runtime retrieval can enable an external semantic reranker after RRF and before diversity filtering:

```env
RAG_RELEVANCE_RERANKER=cohere
COHERE_API_KEY=...
COHERE_RERANK_MODEL=rerank-v3.5
```

The reranker is behind a repository port. With `RAG_RELEVANCE_RERANKER=none`, retrieval remains provider-independent and deterministic. This keeps a real query-document relevance stage available without coupling the application layer to a vendor SDK.

## Dataset shape

A retrieval evaluation case contains:

```json
{
  "question": "How does hybrid retrieval work?",
  "relevantDocumentIds": ["architecture-notes"],
  "retrievedDocumentIds": ["architecture-notes", "finance-notes"]
}
```

`examples/evaluation/retrieval-dataset.json` contains a small seed dataset intended as a format example, not as a statistically meaningful benchmark.

## Practical workflow

1. Version a representative set of questions and relevant document ids.
2. Run the retrieval pipeline for every question using a fixed configuration.
3. Store the ordered document ids returned by retrieval.
4. Calculate Recall@K, MRR and nDCG@K.
5. Compare the new result with the previous baseline before changing weights, chunking, candidate-pool size, reranking, or embedding models.
6. Use ablation results to justify whether each retrieval stage produces measurable value rather than assuming additional complexity is beneficial.

## Generation evaluation boundary

`src/rag/evaluation/generation-quality-metrics.ts` adds deterministic checks for citation precision, citation coverage, unsupported citation references and expected insufficient-context refusals.

For production workloads, a versioned generation dataset should additionally measure:

- groundedness;
- answer relevance;
- citation correctness;
- unsupported-claim rate;
- refusal accuracy for insufficient evidence.

Those checks can be implemented with human review, deterministic assertions for constrained domains, or an explicitly selected evaluator model. The repository keeps generation evaluation separate so retrieval quality is not conflated with LLM judging.
