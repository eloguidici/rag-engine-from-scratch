import { Injectable } from '@nestjs/common';
import {
  DocumentFormat,
  DocumentLoader,
  LoadDocumentInput,
} from '../domain/document-loader';
import { SourceDocument } from '../domain/models';

abstract class BaseDocumentLoader implements DocumentLoader {
  abstract supports(format: DocumentFormat): boolean;
  abstract load(input: LoadDocumentInput): SourceDocument;

  protected build(input: LoadDocumentInput, content: string): SourceDocument {
    return {
      id: input.id,
      title: input.title,
      content: content.replace(/\s+/g, ' ').trim(),
      metadata: {
        ...(input.metadata ?? {}),
        sourceFormat: input.format,
      },
    };
  }
}

@Injectable()
export class PlainTextDocumentLoader extends BaseDocumentLoader {
  supports(format: DocumentFormat): boolean {
    return format === 'text';
  }

  load(input: LoadDocumentInput): SourceDocument {
    return this.build(input, input.content);
  }
}

@Injectable()
export class MarkdownDocumentLoader extends BaseDocumentLoader {
  supports(format: DocumentFormat): boolean {
    return format === 'markdown';
  }

  load(input: LoadDocumentInput): SourceDocument {
    const normalized = input.content
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*>\s?/gm, '');

    return this.build(input, normalized);
  }
}

@Injectable()
export class HtmlDocumentLoader extends BaseDocumentLoader {
  supports(format: DocumentFormat): boolean {
    return format === 'html';
  }

  load(input: LoadDocumentInput): SourceDocument {
    const normalized = input.content
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>');

    return this.build(input, normalized);
  }
}
