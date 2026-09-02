import { ConfigService } from '@nestjs/config';
import {
  ExternalProviderError,
  InvalidProviderResponseError,
} from '../domain/errors';
import { SearchHit } from '../domain/models';
import { CohereRelevanceReranker } from './relevance-rerankers';

const hits: SearchHit[] = [
  {
    chunk: {
      id: 'doc-a:0',
      documentId: 'doc-a',
      text: 'First evidence chunk',
      index: 0,
      metadata: {},
    },
    semanticScore: 0.8,
    keywordScore: 0.4,
    score: 0.6,
  },
  {
    chunk: {
      id: 'doc-b:0',
      documentId: 'doc-b',
      text: 'Second evidence chunk',
      index: 0,
      metadata: {},
    },
    semanticScore: 0.7,
    keywordScore: 0.5,
    score: 0.6,
  },
];

function config(overrides: Record<string, string | number> = {}): ConfigService {
  return new ConfigService({
    COHERE_API_KEY: 'test-key',
    COHERE_RERANK_MODEL: 'rerank-v3.5',
    RAG_RERANK_TIMEOUT_MS: 50,
    ...overrides,
  });
}

describe('CohereRelevanceReranker', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('maps provider rankings back to search hits and replaces their score', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            { index: 1, relevance_score: 0.97 },
            { index: 0, relevance_score: 0.82 },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const reranker = new CohereRelevanceReranker(config());
    const result = await reranker.rerank('evidence', hits, 2);

    expect(result.map((hit) => hit.chunk.id)).toEqual(['doc-b:0', 'doc-a:0']);
    expect(result.map((hit) => hit.score)).toEqual([0.97, 0.82]);

    const request = fetchMock.mock.calls[0][1];
    expect(request?.method).toBe('POST');
    expect(request?.headers).toEqual({
      Authorization: 'Bearer test-key',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(String(request?.body))).toMatchObject({
      query: 'evidence',
      top_n: 2,
      documents: ['First evidence chunk', 'Second evidence chunk'],
    });
  });

  it('fails fast when the API key is missing', async () => {
    const reranker = new CohereRelevanceReranker(config({ COHERE_API_KEY: '' }));

    await expect(reranker.rerank('evidence', hits, 2)).rejects.toMatchObject({
      name: 'ExternalProviderError',
      provider: 'cohere-rerank',
      message: 'Cohere reranker is enabled but COHERE_API_KEY is missing',
    });
  });

  it('translates non-success HTTP responses into provider errors', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 429 }));
    const reranker = new CohereRelevanceReranker(config());

    await expect(reranker.rerank('evidence', hits, 2)).rejects.toMatchObject({
      name: 'ExternalProviderError',
      provider: 'cohere-rerank',
      message: 'Semantic reranking failed',
    });
  });

  it('rejects structurally invalid provider responses', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ unexpected: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const reranker = new CohereRelevanceReranker(config());

    try {
      await reranker.rerank('evidence', hits, 2);
      throw new Error('Expected reranking to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ExternalProviderError);
      expect((error as ExternalProviderError).cause).toBeInstanceOf(
        InvalidProviderResponseError,
      );
    }
  });

  it('aborts requests that exceed the configured timeout', async () => {
    jest.useFakeTimers();
    jest.spyOn(global, 'fetch').mockImplementation((_input, init) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new Error('aborted'));
        });
      });
    });

    const reranker = new CohereRelevanceReranker(
      config({ RAG_RERANK_TIMEOUT_MS: 5 }),
    );
    const promise = reranker.rerank('evidence', hits, 2);

    await jest.advanceTimersByTimeAsync(5);

    await expect(promise).rejects.toMatchObject({
      name: 'ExternalProviderError',
      provider: 'cohere-rerank',
      message: 'Semantic reranking failed',
    });
  });
});
