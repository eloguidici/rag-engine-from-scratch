import { DocumentMetadata } from '../../domain/models';

/**
 * Command that represents the intent to ingest and index a source document.
 */
export class IngestDocumentCommand {
  constructor(
    public readonly title: string,
    public readonly content: string,
    public readonly metadata?: DocumentMetadata,
    public readonly id?: string,
  ) {}
}
