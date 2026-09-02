import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IngestionResult, RagService } from '../rag.service';
import { IngestDocumentCommand } from './ingest-document.command';

/** Handles document ingestion commands and delegates indexing to the application service. */
@CommandHandler(IngestDocumentCommand)
export class IngestDocumentHandler implements ICommandHandler<IngestDocumentCommand> {
  constructor(private readonly ragService: RagService) {}

  execute(command: IngestDocumentCommand): Promise<IngestionResult> {
    return this.ragService.ingest({
      id: command.id,
      title: command.title,
      content: command.content,
      metadata: command.metadata,
    });
  }
}
