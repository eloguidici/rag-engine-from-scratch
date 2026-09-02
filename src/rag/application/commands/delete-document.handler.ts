import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteDocumentResult, RagService } from '../rag.service';
import { DeleteDocumentCommand } from './delete-document.command';

@CommandHandler(DeleteDocumentCommand)
export class DeleteDocumentHandler implements ICommandHandler<DeleteDocumentCommand> {
  constructor(private readonly ragService: RagService) {}

  execute(command: DeleteDocumentCommand): Promise<DeleteDocumentResult> {
    return this.ragService.deleteDocument(command.documentId);
  }
}
