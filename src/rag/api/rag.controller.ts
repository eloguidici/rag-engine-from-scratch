import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Inject,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeleteDocumentCommand } from '../application/commands/delete-document.command';
import { IngestDocumentCommand } from '../application/commands/ingest-document.command';
import {
  DeleteDocumentResult,
  IngestionResult,
} from '../application/rag.service';
import { AskRagQuery } from '../application/queries/ask-rag.query';
import {
  DOCUMENT_FILE_EXTRACTOR,
  DocumentFileExtractor,
  UploadedDocumentFile,
} from '../domain/document-file-extractor';
import { DocumentMetadata, RagAnswer } from '../domain/models';
import { IngestDocumentDto, QueryRagDto, UploadDocumentDto } from './dto';

@ApiTags('rag')
@Controller('rag')
export class RagController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject(DOCUMENT_FILE_EXTRACTOR)
    private readonly fileExtractor: DocumentFileExtractor,
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

  /** Uploads a text, Markdown, HTML, or PDF file and sends extracted text through the same ingestion pipeline. */
  @Post('documents/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and index a document file' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'title'],
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string', example: 'Architecture Notes' },
        id: { type: 'string' },
        metadata: {
          type: 'string',
          description: 'Optional JSON object with primitive metadata values.',
          example: '{"department":"architecture"}',
        },
      },
    },
  })
  async upload(
    @UploadedFile() file: UploadedDocumentFile | undefined,
    @Body() dto: UploadDocumentDto,
  ): Promise<IngestionResult> {
    if (!file) throw new BadRequestException('Document file is required');

    const extracted = await this.fileExtractor.extract(file);
    const metadata = this.parseMetadata(dto.metadata);

    return this.commandBus.execute(
      new IngestDocumentCommand(
        dto.title,
        extracted.content,
        { ...metadata, ...extracted.metadata },
        dto.id,
        extracted.format,
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

  private parseMetadata(value?: string): DocumentMetadata {
    if (!value) return {};

    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new BadRequestException('metadata must be valid JSON');
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BadRequestException('metadata must be a JSON object');
    }

    const metadata: DocumentMetadata = {};
    for (const [key, item] of Object.entries(parsed)) {
      if (
        typeof item !== 'string' &&
        typeof item !== 'number' &&
        typeof item !== 'boolean'
      ) {
        throw new BadRequestException(
          `metadata.${key} must be a string, number, or boolean`,
        );
      }
      metadata[key] = item;
    }

    return metadata;
  }
}
