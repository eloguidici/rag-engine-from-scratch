import { BadRequestException, Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import {
  DocumentFileExtractor,
  ExtractedDocumentFile,
  UploadedDocumentFile,
} from '../domain/document-file-extractor';

@Injectable()
export class UploadedDocumentExtractor implements DocumentFileExtractor {
  private readonly textFormats = new Map<string, ExtractedDocumentFile['format']>([
    ['text/plain', 'text'],
    ['text/markdown', 'markdown'],
    ['text/x-markdown', 'markdown'],
    ['text/html', 'html'],
  ]);

  async extract(file: UploadedDocumentFile): Promise<ExtractedDocumentFile> {
    if (!file.buffer.length) {
      throw new BadRequestException('Uploaded file is empty');
    }

    if (file.mimetype === 'application/pdf') {
      return this.extractPdf(file);
    }

    const format = this.textFormats.get(file.mimetype);
    if (!format) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }

    const content = file.buffer.toString('utf8').trim();
    if (!content) {
      throw new BadRequestException('Uploaded document contains no readable text');
    }

    return {
      content,
      format,
      metadata: this.fileMetadata(file, format),
    };
  }

  private async extractPdf(file: UploadedDocumentFile): Promise<ExtractedDocumentFile> {
    if (!file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      throw new BadRequestException('Invalid PDF file signature');
    }

    const parser = new PDFParse({ data: file.buffer });
    try {
      const result = await parser.getText();
      const content = result.text.replace(/\s+/g, ' ').trim();
      if (!content) {
        throw new BadRequestException('PDF contains no extractable text');
      }

      return {
        content,
        format: 'text',
        metadata: this.fileMetadata(file, 'pdf'),
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Unable to extract text from PDF');
    } finally {
      await parser.destroy();
    }
  }

  private fileMetadata(
    file: UploadedDocumentFile,
    sourceFormat: string,
  ): Record<string, string | number | boolean> {
    return {
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      originalFormat: sourceFormat,
    };
  }
}
