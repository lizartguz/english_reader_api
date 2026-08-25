import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { StoryStatus } from '@/common/enums/domain.enums';

/** Campos permitidos para ordenar el listado administrativo de historias. */
export const STORY_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'publishedAt',
  'title',
  'sortOrder',
] as const;
export type StorySortField = (typeof STORY_SORT_FIELDS)[number];

/** Filtros y paginación para el listado administrativo de historias. */
export class StoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: StoryStatus })
  @IsOptional()
  @IsEnum(StoryStatus, { message: 'El estado del filtro no es válido.' })
  status?: StoryStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'El nivel de lectura del filtro no es válido.' })
  readingLevelId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'El género del filtro no es válido.' })
  genreId?: string;

  @ApiPropertyOptional({ description: 'Fecha mínima de publicación (ISO 8601).' })
  @IsOptional()
  @Type(() => String)
  @IsDateString({}, { message: 'La fecha de publicación inicial no es válida.' })
  publishedFrom?: string;

  @ApiPropertyOptional({ description: 'Fecha máxima de publicación (ISO 8601).' })
  @IsOptional()
  @Type(() => String)
  @IsDateString({}, { message: 'La fecha de publicación final no es válida.' })
  publishedTo?: string;
}

/** Filtros móviles: Flutter solo puede listar historias publicadas. */
export class AppStoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'El nivel de lectura del filtro no es válido.' })
  readingLevelId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'El género del filtro no es válido.' })
  genreId?: string;
}
