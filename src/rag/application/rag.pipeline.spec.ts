import { ConfigService } from '@nestjs/config';
import { ContextBuilderService } from './context-builder.service';
import { RagService } from './rag.service';
import { RetrievalService } from './retrieval.service';
import { TextChunkerService } from './text-chunker.service';
import { EmbeddingProvider, GenerationProvider } from '../domain/ports';
import { InMemoryVectorStore } from '../infrastructure/in-memory-vector-store';
import { WeightedHybridScoringStrategy } from '../infrastructure/weighted-hybrid-scoring.strategy';

class DeterministicEmbeddingProvider implements EmbeddingProvider {
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => {
      const normalized = text.toLowerCase();
      return [
        normalized.includes('invoice') ? 1 : 0,
        normalized.includes('payment') ? 1 : 0,
        normalized.includes('telemetry') ? 1 : 0,
      ];
    });
  }
}

class DeterministicGenerationProvider implements GenerationProvider {
  async generate(_question: string, context: string): Promise<string> {
    return context.includes('invoice payment')
      ? 'The invoice payment is pending. [S1]'
      : 'There is not enough evidence.';
  }
}

describe('RAG pipeline', () => {
  it('ingests, retrieves with metadata filters, and returns grounded citations', async () => {
    const config = new ConfigService({
      RAG_CHUNK_SIZE: '500',
      RAG_CHUNK_OVERLAP: '50',
      RAG_TOP_K: '3',
    });
    const embeddings = new DeterministicEmbeddingProvider();
    const store = new InMemoryVectorStore();
    const strategy = new WeightedHybridScoringStrategy();
    const retrieval = new RetrievalService(embeddings, store, strategy);
    const rag = new RagService(
      new TextChunkerService(config),
      retrieval,
      new ContextBuilderService(),
      config,
      embeddings,
      store,
      new DeterministicGenerationProvider(),
    );

    await rag.ingest({
      id: 'finance-1',
      title: 'Finance Notes',
      content: 'The invoice payment is pending approval by finance.',
      metadata: { department: 'finance' },
    });
    await rag.ingest({
      id: 'ops-1',
      title: 'Operations Notes',
      content: 'Telemetry alerts are reviewed by the operations team.',
      metadata: { department: 'operations' },
    });

    const result = await rag.query('What is the invoice payment status?', 3, {
      department: 'finance',
    });

    expect(result.answer).toContain('pending');
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]).toEqual(
      expect.objectContaining({
        documentId: 'finance-1',
        title: 'Finance Notes',
      }),
    );
  });
});
