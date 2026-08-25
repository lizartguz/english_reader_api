import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { SavedWordStatus } from '@/common/enums/domain.enums';

/** Campos permitidos para ordenar el vocabulario personal. */
export const VOCABULARY_SORT_FIELDS = ['savedAt', 'updatedAt', 'status'] as const;
export type VocabularySortField = (typeof VOCABULARY_SORT_FIELDS)[number];

/** Filtros del vocabulario personal del usuario autenticado. */
export class VocabularyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SavedWordStatus })
  @IsOptional()
  @IsEnum(SavedWordStatus, { message: 'El estado de aprendizaje no es válido.' })
  status?: SavedWordStatus;
}
