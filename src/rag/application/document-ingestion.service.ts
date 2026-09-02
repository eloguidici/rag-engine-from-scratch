import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  DocumentFormat,
  DocumentLoader,
  LoadDocumentInput,
} from '../domain/document-loader';
import { SourceDocument } from '../domain/models';
import {
  HtmlDocumentLoader,
  MarkdownDocumentLoader,
  PlainTextDocumentLoader,
} from '../infrastructure/document-loaders';

export interface PreparedDocument {
  document: SourceDocument;
  contentHash: string;
}

/** Selects a loader and computes a stable hash for dedupe/versioning decisions. */
@Injectable()
export class DocumentIngestionService {
  private readonly loaders: DocumentLoader[];

  constructor(
    textLoader: PlainTextDocumentLoader,
    markdownLoader: MarkdownDocumentLoader,
    htmlLoader: HtmlDocumentLoader,
  ) {
    this.loaders = [textLoader, markdownLoader, htmlLoader];
  }

  prepare(input: LoadDocumentInput): PreparedDocument {
    const loader = this.loaders.find((candidate) => candidate.supports(input.format));
    if (!loader) {
      throw new Error(`Unsupported document format: ${input.format}`);
    }

    const document = loader.load(input);
    const contentHash = createHash('sha256')
      .update(document.content, 'utf8')
      .digest('hex');

    return { document, contentHash };
  }

  static normalizeFormat(format?: string): DocumentFormat {
    if (format === 'markdown' || format === 'html') return format;
    return 'text';
  }
}
