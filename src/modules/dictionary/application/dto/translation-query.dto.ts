import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { ReviewStatus } from '@/common/enums/domain.enums';

/** Campos permitidos para ordenar el listado global de traducciones. */
export const TRANSLATION_SORT_FIELDS = ['createdAt', 'updatedAt', 'reviewStatus'] as const;
export type TranslationSortField = (typeof TRANSLATION_SORT_FIELDS)[number];

/**
 * Filtros del listado administrativo global de traducciones
 * (`GET /admin/translations`), independiente de una palabra puntual.
 */
export class TranslationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Búsqueda por la palabra en inglés asociada.',
    example: 'beautiful',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  word?: string;

  @ApiPropertyOptional({ example: 'es' })
  @IsOptional()
  @IsString()
  @IsIn(['es'], { message: 'Por ahora solo se admite traducción al español.' })
  targetLanguage?: string;

  @ApiPropertyOptional({ enum: ReviewStatus })
  @IsOptional()
  @IsEnum(ReviewStatus, { message: 'El estado de revisión no es válido.' })
  reviewStatus?: ReviewStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La fuente no puede superar los 100 caracteres.' })
  source?: string;
}
