import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { DocumentFormat } from '../domain/document-loader';

/** Request payload used to ingest a document into the retrieval index. */
export class IngestDocumentDto {
  @ApiPropertyOptional({ description: 'Optional stable document identifier.' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'Architecture Notes' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ example: 'Retrieval augmented generation combines retrieval with generation...' })
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiPropertyOptional({ enum: ['text', 'markdown', 'html'], default: 'text' })
  @IsOptional()
  @IsIn(['text', 'markdown', 'html'])
  format?: DocumentFormat;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string | number | boolean>;
}

/** Request payload used to execute a RAG query against indexed content. */
export class QueryRagDto {
  @ApiProperty({ example: 'How does the retrieval pipeline work?' })
  @IsString()
  @MinLength(1)
  question!: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 20, default: 6 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  topK?: number;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Exact-match metadata filters applied before final ranking.',
    example: { category: 'architecture', tenantId: 'acme' },
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, string | number | boolean>;
}
