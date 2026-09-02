import { ContextBuilderService } from './context-builder.service';
import { SearchHit } from '../domain/models';

describe('ContextBuilderService', () => {
  const service = new ContextBuilderService();

  it('builds labeled context and stable citation metadata', () => {
    const hits: SearchHit[] = [
      {
        chunk: {
          id: 'doc-1:0',
          documentId: 'doc-1',
          text: 'RAG combines retrieval and generation.',
          metadata: { title: 'Architecture Notes' },
          vector: [1, 0],
        },
        semanticScore: 0.9,
        keywordScore: 0.5,
        score: 0.788,
      },
    ];

    const result = service.build(hits);

    expect(result.context).toContain('[S1] Architecture Notes');
    expect(result.context).toContain('RAG combines retrieval and generation.');
    expect(result.sources).toEqual([
      expect.objectContaining({
        documentId: 'doc-1',
        chunkId: 'doc-1:0',
        title: 'Architecture Notes',
        score: 0.788,
      }),
    ]);
  });
});
