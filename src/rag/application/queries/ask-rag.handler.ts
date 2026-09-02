import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { RagAnswer } from '../../domain/models';
import { RagService } from '../rag.service';
import { AskRagQuery } from './ask-rag.query';

/** Handles read-only RAG queries. */
@QueryHandler(AskRagQuery)
export class AskRagHandler implements IQueryHandler<AskRagQuery> {
  constructor(private readonly ragService: RagService) {}

  execute(query: AskRagQuery): Promise<RagAnswer> {
    return this.ragService.query(query.question, query.topK, query.filters);
  }
}
