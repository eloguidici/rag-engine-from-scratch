import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IngestDocumentCommand } from '../application/commands/ingest-document.command';
import { AskRagQuery } from '../application/queries/ask-rag.query';
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
  ingest(@Body() dto: IngestDocumentDto) {
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

  /** Retrieves relevant chunks and generates a grounded answer with citations. */
  @Post('query')
  @ApiOperation({ summary: 'Ask a question against indexed documents' })
  query(@Body() dto: QueryRagDto) {
    return this.queryBus.execute(new AskRagQuery(dto.question, dto.topK, dto.filters));
  }
}
