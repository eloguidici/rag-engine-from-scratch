import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { Pool } from 'pg';
import { RagController } from './api/rag.controller';
import { DeleteDocumentHandler } from './application/commands/delete-document.handler';
import { IngestDocumentHandler } from './application/commands/ingest-document.handler';
import { ContextBuilderService } from './application/context-builder.service';
import { DocumentIngestionService } from './application/document-ingestion.service';
import { DocumentRevisionService } from './application/document-revision.service';
import { RagService } from './application/rag.service';
import { RetrievalService } from './application/retrieval.service';
import { AskRagHandler } from './application/queries/ask-rag.handler';
import { TextChunkerService } from './application/text-chunker.service';
import { CHUNKING_STRATEGY } from './domain/chunking-strategy';
import { DOCUMENT_FILE_EXTRACTOR } from './domain/document-file-extractor';
import {
  DOCUMENT_REVISION_REPOSITORY,
  DocumentRevisionRepository,
} from './domain/document-revision.repository';
import {
  EMBEDDING_PROVIDER,
  GENERATION_PROVIDER,
  VECTOR_STORE,
  VectorStore,
} from './domain/ports';
import {
  RELEVANCE_RERANKER,
  RelevanceReranker,
} from './domain/relevance-reranker';
import { RETRIEVAL_FUSION_STRATEGY } from './domain/retrieval-fusion.strategy';
import { RERANKER } from './domain/reranker';
import { RETRIEVAL_SCORING_STRATEGY } from './domain/retrieval-scoring.strategy';
import { DiversityReranker } from './infrastructure/diversity-reranker';
import {
  HtmlDocumentLoader,
  MarkdownDocumentLoader,
  PlainTextDocumentLoader,
} from './infrastructure/document-loaders';
import { InMemoryDocumentRevisionRepository } from './infrastructure/in-memory-document-revision.repository';
import { InMemoryVectorStore } from './infrastructure/in-memory-vector-store';
import { ManagedPostgresPool } from './infrastructure/managed-postgres-pool';
import {
  OpenAIEmbeddingProvider,
  OpenAIGenerationProvider,
} from './infrastructure/openai.providers';
import { PostgresDocumentRevisionRepository } from './infrastructure/postgres-document-revision.repository';
import { POSTGRES_POOL } from './infrastructure/postgres.tokens';
import { PostgresVectorStore } from './infrastructure/postgres-vector-store';
import { ReciprocalRankFusionStrategy } from './infrastructure/reciprocal-rank-fusion.strategy';
import {
  CohereRelevanceReranker,
  NoOpRelevanceReranker,
} from './infrastructure/relevance-rerankers';
import { RecursiveChunkingStrategy } from './infrastructure/recursive-chunking.strategy';
import { UploadedDocumentExtractor } from './infrastructure/uploaded-document.extractor';
import { WeightedHybridScoringStrategy } from './infrastructure/weighted-hybrid-scoring.strategy';

const commandHandlers = [IngestDocumentHandler, DeleteDocumentHandler];
const queryHandlers = [AskRagHandler];

@Module({
  imports: [CqrsModule],
  controllers: [RagController],
  providers: [
    RagService,
    RetrievalService,
    ContextBuilderService,
    TextChunkerService,
    DocumentIngestionService,
    DocumentRevisionService,
    PlainTextDocumentLoader,
    MarkdownDocumentLoader,
    HtmlDocumentLoader,
    ManagedPostgresPool,
    NoOpRelevanceReranker,
    CohereRelevanceReranker,
    ...commandHandlers,
    ...queryHandlers,
    { provide: POSTGRES_POOL, useExisting: ManagedPostgresPool },
    { provide: CHUNKING_STRATEGY, useClass: RecursiveChunkingStrategy },
    { provide: DOCUMENT_FILE_EXTRACTOR, useClass: UploadedDocumentExtractor },
    { provide: EMBEDDING_PROVIDER, useClass: OpenAIEmbeddingProvider },
    { provide: GENERATION_PROVIDER, useClass: OpenAIGenerationProvider },
    {
      provide: VECTOR_STORE,
      inject: [ConfigService, POSTGRES_POOL],
      useFactory: (config: ConfigService, pool: Pool): VectorStore =>
        config.get<string>('RAG_PERSISTENCE') === 'postgres'
          ? new PostgresVectorStore(pool)
          : new InMemoryVectorStore(),
    },
    {
      provide: DOCUMENT_REVISION_REPOSITORY,
      inject: [ConfigService, POSTGRES_POOL],
      useFactory: (
        config: ConfigService,
        pool: Pool,
      ): DocumentRevisionRepository =>
        config.get<string>('RAG_PERSISTENCE') === 'postgres'
          ? new PostgresDocumentRevisionRepository(pool)
          : new InMemoryDocumentRevisionRepository(),
    },
    {
      provide: RETRIEVAL_SCORING_STRATEGY,
      useClass: WeightedHybridScoringStrategy,
    },
    {
      provide: RETRIEVAL_FUSION_STRATEGY,
      useClass: ReciprocalRankFusionStrategy,
    },
    {
      provide: RELEVANCE_RERANKER,
      inject: [ConfigService, NoOpRelevanceReranker, CohereRelevanceReranker],
      useFactory: (
        config: ConfigService,
        noOp: NoOpRelevanceReranker,
        cohere: CohereRelevanceReranker,
      ): RelevanceReranker =>
        config.get<string>('RAG_RELEVANCE_RERANKER') === 'cohere' ? cohere : noOp,
    },
    { provide: RERANKER, useClass: DiversityReranker },
  ],
})
export class RagModule {}
