import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { Chunk, SearchHit } from '../domain/models';
import { ReciprocalRankFusionStrategy } from '../infrastructure/reciprocal-rank-fusion.strategy';
import { WeightedHybridScoringStrategy } from '../infrastructure/weighted-hybrid-scoring.strategy';
import {
  RetrievalEvaluationCase,
  summarizeRetrievalEvaluation,
} from './retrieval-metrics';

interface BenchmarkDataset {
  version: string;
  documents: Array<{ id: string; text: string }>;
  cases: Array<{ question: string; relevantDocumentIds: string[] }>;
}

interface PipelineResult {
  pipeline: string;
  recallAt5: number;
  mrr: number;
  ndcgAt5: number;
  p50Ms: number;
  p95Ms: number;
}

const datasetPath = resolve(
  process.cwd(),
  'examples/evaluation/benchmark-dataset.json',
);
const dataset = JSON.parse(readFileSync(datasetPath, 'utf8')) as BenchmarkDataset;
const chunks: Chunk[] = dataset.documents.map((document, index) => ({
  id: document.id,
  documentId: document.id,
  text: document.text,
  index,
  metadata: {},
}));

const scoring = new WeightedHybridScoringStrategy();
const fusion = new ReciprocalRankFusionStrategy();
const pipelines = ['bm25', 'dense', 'hybrid', 'hybrid+rrf'] as const;
const results: PipelineResult[] = pipelines.map((pipeline) => runPipeline(pipeline));

console.log(`Retrieval benchmark dataset: ${dataset.version}`);
console.table(results);
console.log(
  JSON.stringify(
    {
      datasetVersion: dataset.version,
      configuration: {
        topK: 5,
        semanticProxy: 'deterministic token-vector cosine',
        hybridWeights: { semantic: 0.72, lexical: 0.28 },
        rrfRankConstant: 60,
      },
      results,
    },
    null,
    2,
  ),
);

function runPipeline(pipeline: (typeof pipelines)[number]): PipelineResult {
  const latencies: number[] = [];
  const evaluationCases: RetrievalEvaluationCase[] = dataset.cases.map((item) => {
    const started = performance.now();
    const ranked = rank(item.question, pipeline);
    latencies.push(performance.now() - started);
    return {
      question: item.question,
      relevantDocumentIds: item.relevantDocumentIds,
      retrievedDocumentIds: ranked.map((hit) => hit.chunk.documentId),
    };
  });

  const summary = summarizeRetrievalEvaluation(evaluationCases, 5);
  return {
    pipeline,
    recallAt5: round(summary.recallAtK),
    mrr: round(summary.meanReciprocalRank),
    ndcgAt5: round(summary.ndcgAtK),
    p50Ms: round(percentile(latencies, 0.5)),
    p95Ms: round(percentile(latencies, 0.95)),
  };
}

function rank(
  query: string,
  pipeline: (typeof pipelines)[number],
): SearchHit[] {
  const queryVector = tokenVector(query);
  const hits = chunks.map((chunk) => {
    const semanticScore = cosine(queryVector, tokenVector(chunk.text));
    const { keywordScore, finalScore } = scoring.score({
      query,
      chunk,
      corpus: chunks,
      semanticScore,
    });
    return { chunk, semanticScore, keywordScore, score: finalScore };
  });

  if (pipeline === 'bm25') {
    return hits.sort((a, b) => b.keywordScore - a.keywordScore);
  }
  if (pipeline === 'dense') {
    return hits.sort((a, b) => b.semanticScore - a.semanticScore);
  }
  if (pipeline === 'hybrid') {
    return hits.sort((a, b) => b.score - a.score);
  }
  return fusion.fuse(hits);
}

function tokenVector(text: string): number[] {
  const vector = Array.from({ length: 64 }, () => 0);
  for (const token of tokenize(text)) {
    let hash = 2166136261;
    for (const character of token) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    vector[Math.abs(hash) % vector.length] += 1;
  }
  return vector;
}

function cosine(left: number[], right: number[]): number {
  const dot = left.reduce((sum, value, index) => sum + value * right[index], 0);
  const leftNorm = Math.sqrt(left.reduce((sum, value) => sum + value * value, 0));
  const rightNorm = Math.sqrt(right.reduce((sum, value) => sum + value * value, 0));
  return leftNorm === 0 || rightNorm === 0 ? 0 : dot / (leftNorm * rightNorm);
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(percentileValue * sorted.length) - 1),
  );
  return sorted[index];
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}
