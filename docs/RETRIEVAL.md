# Retrieval Design

This document describes the retrieval pipeline independently from generation. The goal is to make ranking behavior explicit, measurable, and replaceable.

## Pipeline

```text
Question
  ↓
Query embedding
  ↓
Semantic candidate generation
  ↓
Metadata filtering
  ↓
BM25 lexical scoring
  ↓
Candidate thresholding
  ↓
Reciprocal Rank Fusion
  ↓
Diversity reranking
  ↓
Top-K evidence
  ↓
Context Builder
```

## Candidate generation

`RAG_CANDIDATE_MULTIPLIER` controls how many candidates are considered before the final Top-K is selected.

For example, with `topK=5` and a multiplier of `5`, retrieval can inspect up to 25 candidates before fusion and reranking. This avoids making diversity or reranking decisions over an already-truncated result set.

## Semantic retrieval

The vector store produces cosine-similarity evidence. The current in-memory adapter keeps the calculation explicit; a persistent adapter can later move this step to pgvector, Qdrant, or another vector database without changing `RetrievalService`.

## BM25 lexical evidence

`WeightedHybridScoringStrategy` computes corpus-aware BM25 over the filtered candidate corpus. BM25 helps preserve exact identifiers, acronyms, codes, names, and domain-specific vocabulary that semantic similarity can underweight.

The BM25 score is normalized before it is combined with cosine similarity so the two scales remain bounded and inspectable.

## Weighted hybrid scoring

The baseline hybrid score remains useful as an explicit calibrated strategy:

```text
hybridScore = semanticScore * 0.72 + bm25Score * 0.28
```

This score is used for candidate relevance and thresholding.

## Reciprocal Rank Fusion

After candidate generation, `ReciprocalRankFusionStrategy` combines the independent semantic and lexical rankings:

```text
RRF(d) = Σ 1 / (k + rank_i(d))
```

The implementation uses `k = 60`.

RRF is useful because it depends on rank position rather than requiring semantic and lexical score distributions to be perfectly calibrated. Signals with zero evidence are intentionally excluded from their ranking list so absent evidence does not receive an artificial reciprocal-rank contribution.

## Minimum score

`RAG_MIN_SCORE` removes weak candidates before fusion and reranking. The default is zero because a useful threshold is corpus-specific and should be established with an evaluation dataset rather than guessed globally.

## Metadata filtering

Queries can constrain retrieval using exact metadata matches. Filtering is applied before corpus-aware BM25 scoring so lexical statistics are calculated against the relevant corpus rather than unrelated documents.

Example:

```json
{
  "question": "How are invoices approved?",
  "filters": {
    "category": "finance"
  }
}
```

## Diversity reranking

`DiversityReranker` runs after fusion. It currently performs two deterministic controls:

- removes near-duplicate chunks using Jaccard token similarity;
- limits repeated chunks from the same document.

This is intentionally a separate `Reranker` port. A later cross-encoder, LLM-based reranker, or learned ranking model can replace it without changing retrieval orchestration.

## Why the stages are separate

The pipeline separates candidate generation, scoring, fusion, filtering, and reranking because they answer different questions:

- **candidate generation**: what could be relevant?
- **scoring**: how strong is each retrieval signal?
- **fusion**: how should independent rankings be combined?
- **thresholding**: what evidence is too weak to keep?
- **reranking**: what final evidence set is most useful for generation?

Keeping these concerns separate makes retrieval easier to test and evaluate.

## Evaluation direction

The next evaluation layer should compare at least:

- semantic only;
- BM25 only;
- weighted hybrid;
- RRF;
- RRF plus diversity reranking.

Useful metrics include Hit@K, Recall@K, MRR, NDCG, latency, and context redundancy.
