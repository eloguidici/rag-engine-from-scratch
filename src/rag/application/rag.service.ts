import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { RagAnswer, SourceDocument } from '../domain/models';
import {
  EMBEDDING_PROVIDER,
  EmbeddingProvider,
  GENERATION_PROVIDER,
  GenerationProvider,
  VECTOR_STORE,
  VectorStore,
} from '../domain/ports';
import { ContextBuilderService } from './context-builder.service';
import { RetrievalService } from './retrieval.service';
import { TextChunkerService } from './text-chunker.service';

export interface IngestionResult {
  documentId: string;
  chunksIndexed: number;
}

@Injectable()
export class RagService {
  constructor(
    private readonly chunker: TextChunkerService,
    private readonly retrieval: RetrievalService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly config: ConfigService,
    @Inject(EMBEDDING_PROVIDER) private readonly embeddings: EmbeddingProvider,
    @Inject(VECTOR_STORE) private readonly store: VectorStore,
    @Inject(GENERATION_PROVIDER) private readonly generator: GenerationProvider,
  ) {}

  /**
   * Normalizes, chunks, embeds and indexes one source document.
   */
  async ingest(
    input: Omit<SourceDocument, 'id'> & { id?: string },
  ): Promise<IngestionResult> {
    const document: SourceDocument = { ...input, id: input.id ?? randomUUID() };
    const chunks = this.chunker.chunk(document);
    const vectors = await this.embeddings.embed(chunks.map((chunk) => chunk.text));

    if (vectors.length !== chunks.length) {
      throw new Error(
        `Embedding provider returned ${vectors.length} vectors for ${chunks.length} chunks`,
      );
    }

    await this.store.upsert(
      chunks.map((chunk, index) => ({ ...chunk, vector: vectors[index] })),
    );

    return { documentId: document.id, chunksIndexed: chunks.length };
  }

  /**
   * Retrieves relevant evidence, constrains the generation context and returns
   * an answer together with the exact chunks used as citations.
   */
  async query(question: string, requestedTopK?: number): Promise<RagAnswer> {
    const topK = requestedTopK ?? Number(this.config.get('RAG_TOP_K') ?? 6);
    const hits = await this.retrieval.search(question, topK);
    const { context, sources } = this.contextBuilder.build(hits);
    const answer = await this.generator.generate(question, context);

    return { answer, citations: sources };
  }
}
