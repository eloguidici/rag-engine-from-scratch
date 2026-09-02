import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { RagService } from '../rag.service';
import { AskRagQuery } from './ask-rag.query';

/** Handles read-only RAG queries. */
@QueryHandler(AskRagQuery)
export class AskRagHandler implements IQueryHandler<AskRagQuery> {
  constructor(private readonly ragService: RagService) {}

  execute(query: AskRagQuery) {
    return this.ragService.query(query.question, query.topK);
  }
}
