import { InMemoryVectorStore } from './in-memory-vector-store';

describe('InMemoryVectorStore', () => {
  it('ranks chunks by cosine similarity', async () => {
    const store = new InMemoryVectorStore();
    await store.upsert([
      {
        id: 'a',
        documentId: 'doc-a',
        index: 0,
        text: 'alpha',
        metadata: {},
        vector: [1, 0],
      },
      {
        id: 'b',
        documentId: 'doc-b',
        index: 0,
        text: 'beta',
        metadata: {},
        vector: [0, 1],
      },
    ]);

    const [best] = await store.semanticSearch([0.9, 0.1], 1);
    expect(best.chunk.id).toBe('a');
    expect(best.semanticScore).toBeGreaterThan(0.9);
  });
});
