import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { PartOfSpeech, ReviewStatus } from '@/common/enums/domain.enums';

/** Campos permitidos para ordenar el listado administrativo de palabras. */
export const WORD_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'word',
  'normalizedWord',
  'reviewStatus',
  'partOfSpeech',
] as const;
export type WordSortField = (typeof WORD_SORT_FIELDS)[number];

/** Filtros del diccionario administrativo. */
export class AdminWordQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  @IsIn(['en'], { message: 'Por ahora solo se admite diccionario en inglés.' })
  language?: string;

  @ApiPropertyOptional({ enum: ReviewStatus })
  @IsOptional()
  @IsEnum(ReviewStatus, { message: 'El estado de revisión no es válido.' })
  reviewStatus?: ReviewStatus;

  @ApiPropertyOptional({ enum: PartOfSpeech })
  @IsOptional()
  @IsEnum(PartOfSpeech, { message: 'El tipo gramatical no es válido.' })
  partOfSpeech?: PartOfSpeech;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La fuente no puede superar los 100 caracteres.' })
  source?: string;
}
