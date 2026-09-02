import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
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
  EMBEDDING_PROVIDER,
  GENERATION_PROVIDER,
  VECTOR_STORE,
} from './domain/ports';
import { RETRIEVAL_FUSION_STRATEGY } from './domain/retrieval-fusion.strategy';
import { RERANKER } from './domain/reranker';
import { RETRIEVAL_SCORING_STRATEGY } from './domain/retrieval-scoring.strategy';
import { DiversityReranker } from './infrastructure/diversity-reranker';
import {
  HtmlDocumentLoader,
  MarkdownDocumentLoader,
  PlainTextDocumentLoader,
} from './infrastructure/document-loaders';
import { InMemoryVectorStore } from './infrastructure/in-memory-vector-store';
import {
  OpenAIEmbeddingProvider,
  OpenAIGenerationProvider,
} from './infrastructure/openai.providers';
import { ReciprocalRankFusionStrategy } from './infrastructure/reciprocal-rank-fusion.strategy';
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
    ...commandHandlers,
    ...queryHandlers,
    { provide: CHUNKING_STRATEGY, useClass: RecursiveChunkingStrategy },
    { provide: DOCUMENT_FILE_EXTRACTOR, useClass: UploadedDocumentExtractor },
    { provide: EMBEDDING_PROVIDER, useClass: OpenAIEmbeddingProvider },
    { provide: GENERATION_PROVIDER, useClass: OpenAIGenerationProvider },
    { provide: VECTOR_STORE, useClass: InMemoryVectorStore },
    {
      provide: RETRIEVAL_SCORING_STRATEGY,
      useClass: WeightedHybridScoringStrategy,
    },
    {
      provide: RETRIEVAL_FUSION_STRATEGY,
      useClass: ReciprocalRankFusionStrategy,
    },
    { provide: RERANKER, useClass: DiversityReranker },
  ],
})
export class RagModule {}
