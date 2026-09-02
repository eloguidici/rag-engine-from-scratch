import { ConfigService } from '@nestjs/config';
import { TextChunkerService } from './text-chunker.service';

describe('TextChunkerService', () => {
  it('splits long documents into overlapping chunks and preserves metadata', () => {
    const config = {
      get: (key: string) => ({ RAG_CHUNK_SIZE: '40', RAG_CHUNK_OVERLAP: '10' })[key],
    } as ConfigService;
    const service = new TextChunkerService(config);

    const chunks = service.chunk({
      id: 'doc-1',
      title: 'Test Document',
      content: 'This is the first sentence. This is the second sentence. This is the third sentence.',
      metadata: { category: 'test' },
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].documentId).toBe('doc-1');
    expect(chunks[0].metadata).toMatchObject({ title: 'Test Document', category: 'test' });
  });

  it('returns no chunks for blank content', () => {
    const config = { get: () => undefined } as unknown as ConfigService;
    const service = new TextChunkerService(config);
    expect(service.chunk({ id: 'x', title: 'Empty', content: '   ' })).toEqual([]);
  });
});
