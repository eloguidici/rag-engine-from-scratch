# Retrieval Evaluation

The repository includes deterministic retrieval metrics so ranking changes can be compared instead of judged only by anecdotal queries.

## Metrics

Implemented in `src/rag/evaluation/retrieval-metrics.ts`:

- `Recall@K`: fraction of relevant documents present in the first K results.
- `MRR`: reciprocal rank of the first relevant result, averaged across the dataset.
- `nDCG@K`: rank-sensitive relevance quality normalized against the ideal ordering.

The metric implementation is covered by unit tests and has no model/provider dependency.

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

## Generation evaluation boundary

Retrieval evaluation is deterministic and implemented locally. Generation evaluation is intentionally documented rather than hidden behind a vendor-specific evaluator.

For production workloads, add a versioned generation dataset and measure at least:

- groundedness;
- answer relevance;
- citation correctness;
- unsupported-claim rate.

Those checks can be implemented with human review, deterministic assertions for constrained domains, or an explicitly selected evaluator model. The repository keeps this as a separate concern so retrieval quality is not conflated with generation quality.
