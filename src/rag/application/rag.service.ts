import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { DocumentFormat } from '../domain/document-loader';
import { InvalidProviderResponseError } from '../domain/errors';
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
import { DocumentIngestionService } from './document-ingestion.service';
import { DocumentRevisionService } from './document-revision.service';
import { RetrievalService } from './retrieval.service';
import { TextChunkerService } from './text-chunker.service';

export interface IngestionResult {
  documentId: string;
  chunksIndexed: number;
  version: number;
  duplicate: boolean;
}

export interface IngestionInput extends Omit<SourceDocument, 'id'> {
  id?: string;
  format?: DocumentFormat;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly chunker: TextChunkerService,
    private readonly retrieval: RetrievalService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly ingestion: DocumentIngestionService,
    private readonly revisions: DocumentRevisionService,
    private readonly config: ConfigService,
    @Inject(EMBEDDING_PROVIDER) private readonly embeddings: EmbeddingProvider,
    @Inject(VECTOR_STORE) private readonly store: VectorStore,
    @Inject(GENERATION_PROVIDER) private readonly generator: GenerationProvider,
  ) {}

  /** Normalizes, versions, chunks, embeds and indexes one source document. */
  async ingest(input: IngestionInput): Promise<IngestionResult> {
    const startedAt = Date.now();
    const documentId = input.id ?? randomUUID();
    const { document, contentHash } = this.ingestion.prepare({
      id: documentId,
      title: input.title,
      content: input.content,
      format: input.format ?? 'text',
      metadata: input.metadata,
    });
    const revision = this.revisions.evaluate(documentId, contentHash);

    if (revision.duplicate) {
      this.logger.log(
        JSON.stringify({
          event: 'rag.ingest.duplicate',
          documentId,
          version: revision.version,
          durationMs: Date.now() - startedAt,
        }),
      );
      return {
        documentId,
        chunksIndexed: 0,
        version: revision.version,
        duplicate: true,
      };
    }

    const versionedDocument: SourceDocument = {
      ...document,
      metadata: {
        ...(document.metadata ?? {}),
        version: revision.version,
        contentHash,
      },
    };
    const chunks = this.chunker.chunk(versionedDocument);
    const vectors = await this.embeddings.embed(chunks.map((chunk) => chunk.text));

    if (vectors.length !== chunks.length) {
      throw new InvalidProviderResponseError(
        `Embedding provider returned ${vectors.length} vectors for ${chunks.length} chunks`,
      );
    }

    await this.store.deleteByDocumentId(documentId);
    await this.store.upsert(
      chunks.map((chunk, index) => ({ ...chunk, vector: vectors[index] })),
    );
    this.revisions.commit(documentId, contentHash, revision.version);

    this.logger.log(
      JSON.stringify({
        event: 'rag.ingest.completed',
        documentId,
        chunksIndexed: chunks.length,
        version: revision.version,
        durationMs: Date.now() - startedAt,
      }),
    );

    return {
      documentId,
      chunksIndexed: chunks.length,
      version: revision.version,
      duplicate: false,
    };
  }

  /** Retrieves evidence and returns a grounded answer with citations. */
  async query(
    question: string,
    requestedTopK?: number,
    filters?: Record<string, string | number | boolean>,
  ): Promise<RagAnswer> {
    const startedAt = Date.now();
    const topK = requestedTopK ?? Number(this.config.get('RAG_TOP_K') ?? 6);
    const hits = await this.retrieval.search(question, topK, filters);
    const { context, sources } = this.contextBuilder.build(hits);
    const answer = await this.generator.generate(question, context);

    this.logger.log(
      JSON.stringify({
        event: 'rag.query.completed',
        topK,
        filters: filters ?? {},
        retrievedChunks: hits.length,
        contextChars: context.length,
        durationMs: Date.now() - startedAt,
      }),
    );

    return { answer, citations: sources };
  }
}
