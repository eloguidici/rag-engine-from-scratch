import { Body, Controller, Delete, Param, Post, Put } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeleteDocumentCommand } from '../application/commands/delete-document.command';
import { IngestDocumentCommand } from '../application/commands/ingest-document.command';
import {
  DeleteDocumentResult,
  IngestionResult,
} from '../application/rag.service';
import { AskRagQuery } from '../application/queries/ask-rag.query';
import { RagAnswer } from '../domain/models';
import { IngestDocumentDto, QueryRagDto } from './dto';

@ApiTags('rag')
@Controller('rag')
export class RagController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /** Indexes a source document by normalizing, chunking, embedding, and storing it. */
  @Post('documents')
  @ApiOperation({ summary: 'Ingest and index a document' })
  ingest(@Body() dto: IngestDocumentDto): Promise<IngestionResult> {
    return this.commandBus.execute(
      new IngestDocumentCommand(
        dto.title,
        dto.content,
        dto.metadata,
        dto.id,
        dto.format ?? 'text',
      ),
    );
  }

  /** Reindexes a stable document id, creating a new revision only when content changed. */
  @Put('documents/:id')
  @ApiOperation({ summary: 'Reindex an existing document' })
  reindex(
    @Param('id') documentId: string,
    @Body() dto: IngestDocumentDto,
  ): Promise<IngestionResult> {
    return this.commandBus.execute(
      new IngestDocumentCommand(
        dto.title,
        dto.content,
        dto.metadata,
        documentId,
        dto.format ?? 'text',
      ),
    );
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Remove a document and its indexed chunks' })
  deleteDocument(@Param('id') documentId: string): Promise<DeleteDocumentResult> {
    return this.commandBus.execute(new DeleteDocumentCommand(documentId));
  }

  /** Retrieves relevant chunks and generates a grounded answer with citations. */
  @Post('query')
  @ApiOperation({ summary: 'Ask a question against indexed documents' })
  query(@Body() dto: QueryRagDto): Promise<RagAnswer> {
    return this.queryBus.execute(new AskRagQuery(dto.question, dto.topK, dto.filters));
  }
}
