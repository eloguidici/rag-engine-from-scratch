import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { RagAnswer, SourceDocument } from '../domain/models';
import { EMBEDDING_PROVIDER, EmbeddingProvider, GENERATION_PROVIDER, GenerationProvider, VECTOR_STORE, VectorStore } from '../domain/ports';
import { RetrievalService } from './retrieval.service';
import { TextChunkerService } from './text-chunker.service';

@Injectable()
export class RagService {
  constructor(
    private readonly chunker: TextChunkerService,
    private readonly retrieval: RetrievalService,
    private readonly config: ConfigService,
    @Inject(EMBEDDING_PROVIDER) private readonly embeddings: EmbeddingProvider,
    @Inject(VECTOR_STORE) private readonly store: VectorStore,
    @Inject(GENERATION_PROVIDER) private readonly generator: GenerationProvider,
  ) {}

  async ingest(input: Omit<SourceDocument, 'id'> & { id?: string }) {
    const document: SourceDocument = { ...input, id: input.id ?? randomUUID() };
    const chunks = this.chunker.chunk(document);
    const vectors = await this.embeddings.embed(chunks.map((chunk) => chunk.text));
    await this.store.upsert(chunks.map((chunk, i) => ({ ...chunk, vector: vectors[i] })));
    return { documentId: document.id, chunksIndexed: chunks.length };
  }

  async query(question: string, requestedTopK?: number): Promise<RagAnswer> {
    const topK = requestedTopK ?? Number(this.config.get('RAG_TOP_K') ?? 6);
    const hits = await this.retrieval.search(question, topK);
    const context = hits
      .map((hit, index) => `[S${index + 1}] ${String(hit.chunk.metadata.title ?? hit.chunk.documentId)}\n${hit.chunk.text}`)
      .join('\n\n');

    const answer = await this.generator.generate(question, context);
    return {
      answer,
      citations: hits.map((hit) => ({
        documentId: hit.chunk.documentId,
        chunkId: hit.chunk.id,
        title: String(hit.chunk.metadata.title ?? ''),
        excerpt: hit.chunk.text.slice(0, 280),
        score: Number(hit.score.toFixed(4)),
      })),
    };
  }
}
