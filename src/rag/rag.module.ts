import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { RagController } from './api/rag.controller';
import { IngestDocumentHandler } from './application/commands/ingest-document.handler';
import { RagService } from './application/rag.service';
import { RetrievalService } from './application/retrieval.service';
import { AskRagHandler } from './application/queries/ask-rag.handler';
import { TextChunkerService } from './application/text-chunker.service';
import {
  EMBEDDING_PROVIDER,
  GENERATION_PROVIDER,
  VECTOR_STORE,
} from './domain/ports';
import { InMemoryVectorStore } from './infrastructure/in-memory-vector-store';
import {
  OpenAIEmbeddingProvider,
  OpenAIGenerationProvider,
} from './infrastructure/openai.providers';

@Module({
  imports: [CqrsModule],
  controllers: [RagController],
  providers: [
    RagService,
    RetrievalService,
    TextChunkerService,
    IngestDocumentHandler,
    AskRagHandler,
    { provide: EMBEDDING_PROVIDER, useClass: OpenAIEmbeddingProvider },
    { provide: GENERATION_PROVIDER, useClass: OpenAIGenerationProvider },
    { provide: VECTOR_STORE, useClass: InMemoryVectorStore },
  ],
})
export class RagModule {}
