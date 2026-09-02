export interface RetrievalEvaluationCase {
  question: string;
  relevantDocumentIds: string[];
  retrievedDocumentIds: string[];
}

export interface RetrievalEvaluationSummary {
  cases: number;
  recallAtK: number;
  meanReciprocalRank: number;
  ndcgAtK: number;
}

export function recallAtK(
  relevantDocumentIds: string[],
  retrievedDocumentIds: string[],
  k: number,
): number {
  if (relevantDocumentIds.length === 0) return 1;
  const relevant = new Set(relevantDocumentIds);
  const hits = new Set(retrievedDocumentIds.slice(0, k).filter((id) => relevant.has(id)));
  return hits.size / relevant.size;
}

export function reciprocalRank(
  relevantDocumentIds: string[],
  retrievedDocumentIds: string[],
): number {
  const relevant = new Set(relevantDocumentIds);
  const index = retrievedDocumentIds.findIndex((id) => relevant.has(id));
  return index === -1 ? 0 : 1 / (index + 1);
}

export function ndcgAtK(
  relevantDocumentIds: string[],
  retrievedDocumentIds: string[],
  k: number,
): number {
  if (relevantDocumentIds.length === 0) return 1;
  const relevant = new Set(relevantDocumentIds);
  const actual = retrievedDocumentIds.slice(0, k).map((id) => (relevant.has(id) ? 1 : 0));
  const ideal = Array.from({ length: Math.min(k, relevant.size) }, () => 1);

  const dcg = discountedCumulativeGain(actual);
  const idcg = discountedCumulativeGain(ideal);
  return idcg === 0 ? 0 : dcg / idcg;
}

export function summarizeRetrievalEvaluation(
  cases: RetrievalEvaluationCase[],
  k: number,
): RetrievalEvaluationSummary {
  if (cases.length === 0) {
    return { cases: 0, recallAtK: 0, meanReciprocalRank: 0, ndcgAtK: 0 };
  }

  const totals = cases.reduce(
    (acc, item) => ({
      recall: acc.recall + recallAtK(item.relevantDocumentIds, item.retrievedDocumentIds, k),
      mrr: acc.mrr + reciprocalRank(item.relevantDocumentIds, item.retrievedDocumentIds),
      ndcg: acc.ndcg + ndcgAtK(item.relevantDocumentIds, item.retrievedDocumentIds, k),
    }),
    { recall: 0, mrr: 0, ndcg: 0 },
  );

  return {
    cases: cases.length,
    recallAtK: totals.recall / cases.length,
    meanReciprocalRank: totals.mrr / cases.length,
    ndcgAtK: totals.ndcg / cases.length,
  };
}

function discountedCumulativeGain(relevance: number[]): number {
  return relevance.reduce(
    (sum, value, index) => sum + value / Math.log2(index + 2),
    0,
  );
}
