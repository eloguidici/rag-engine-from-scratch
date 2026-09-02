import { ConfigService } from '@nestjs/config';
import { EmbeddingProvider, GenerationProvider } from '../domain/ports';
import {
  HtmlDocumentLoader,
  MarkdownDocumentLoader,
  PlainTextDocumentLoader,
} from '../infrastructure/document-loaders';
import { InMemoryDocumentRevisionRepository } from '../infrastructure/in-memory-document-revision.repository';
import { InMemoryVectorStore } from '../infrastructure/in-memory-vector-store';
import { RecursiveChunkingStrategy } from '../infrastructure/recursive-chunking.strategy';
import { WeightedHybridScoringStrategy } from '../infrastructure/weighted-hybrid-scoring.strategy';
import { ContextBuilderService } from './context-builder.service';
import { DocumentIngestionService } from './document-ingestion.service';
import { DocumentRevisionService } from './document-revision.service';
import { RagService } from './rag.service';
import { RetrievalService } from './retrieval.service';
import { TextChunkerService } from './text-chunker.service';

class DeterministicEmbeddingProvider implements EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]> {
    return Promise.resolve(
      texts.map((text) => {
        const normalized = text.toLowerCase();
        return [
          normalized.includes('invoice') ? 1 : 0,
          normalized.includes('payment') ? 1 : 0,
          normalized.includes('telemetry') ? 1 : 0,
        ];
      }),
    );
  }
}

class DeterministicGenerationProvider implements GenerationProvider {
  generate(question: string, context: string): Promise<string> {
    void question;
    return Promise.resolve(
      context.includes('invoice payment')
        ? 'The invoice payment is pending. [S1]'
        : 'There is not enough evidence.',
    );
  }
}

describe('RAG pipeline', () => {
  it('ingests, deduplicates, reindexes and returns grounded citations', async () => {
    const config = new ConfigService({
      RAG_CHUNK_SIZE: '500',
      RAG_CHUNK_OVERLAP: '50',
      RAG_CHUNK_MAX_TOKENS: '125',
      RAG_TOP_K: '3',
    });
    const embeddings = new DeterministicEmbeddingProvider();
    const store = new InMemoryVectorStore();
    const strategy = new WeightedHybridScoringStrategy();
    const retrieval = new RetrievalService(embeddings, store, strategy);
    const ingestion = new DocumentIngestionService(
      new PlainTextDocumentLoader(),
      new MarkdownDocumentLoader(),
      new HtmlDocumentLoader(),
    );
    const rag = new RagService(
      new TextChunkerService(config, new RecursiveChunkingStrategy()),
      retrieval,
      new ContextBuilderService(),
      ingestion,
      new DocumentRevisionService(new InMemoryDocumentRevisionRepository()),
      config,
      embeddings,
      store,
      new DeterministicGenerationProvider(),
    );

    const first = await rag.ingest({
      id: 'finance-1',
      title: 'Finance Notes',
      content: '# Status\nThe invoice payment is pending approval by finance.',
      format: 'markdown',
      metadata: { department: 'finance' },
    });
    const duplicate = await rag.ingest({
      id: 'finance-1',
      title: 'Finance Notes',
      content: '# Status\nThe invoice payment is pending approval by finance.',
      format: 'markdown',
      metadata: { department: 'finance' },
    });
    const updated = await rag.ingest({
      id: 'finance-1',
      title: 'Finance Notes',
      content: '<p>The invoice payment is pending final approval by finance.</p>',
      format: 'html',
      metadata: { department: 'finance' },
    });

    expect(first).toEqual(expect.objectContaining({ version: 1, duplicate: false }));
    expect(duplicate).toEqual(expect.objectContaining({ version: 1, duplicate: true }));
    expect(updated).toEqual(expect.objectContaining({ version: 2, duplicate: false }));

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
