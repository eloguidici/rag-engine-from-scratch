import { BadRequestException } from '@nestjs/common';
import { UploadedDocumentExtractor } from './uploaded-document.extractor';

describe('UploadedDocumentExtractor', () => {
  const extractor = new UploadedDocumentExtractor();

  it('extracts UTF-8 text files and preserves file metadata', async () => {
    const result = await extractor.extract({
      originalname: 'notes.md',
      mimetype: 'text/markdown',
      size: 22,
      buffer: Buffer.from('# Notes\nInvoice status'),
    });

    expect(result.format).toBe('markdown');
    expect(result.content).toContain('Invoice status');
    expect(result.metadata).toMatchObject({
      fileName: 'notes.md',
      mimeType: 'text/markdown',
      originalFormat: 'markdown',
    });
  });

  it('rejects unsupported MIME types', async () => {
    await expect(
      extractor.extract({
        originalname: 'archive.zip',
        mimetype: 'application/zip',
        size: 4,
        buffer: Buffer.from('data'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects files labeled as PDF when the PDF signature is missing', async () => {
    await expect(
      extractor.extract({
        originalname: 'fake.pdf',
        mimetype: 'application/pdf',
        size: 8,
        buffer: Buffer.from('not-pdf'),
      }),
    ).rejects.toThrow('Invalid PDF file signature');
  });
});
