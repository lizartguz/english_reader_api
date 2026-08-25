import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

/** Campos permitidos para ordenar el listado de géneros. */
export const GENRE_SORT_FIELDS = ['createdAt', 'sortOrder', 'code', 'name'] as const;
export type GenreSortField = (typeof GENRE_SORT_FIELDS)[number];

/** Filtros y paginación para el listado administrativo de géneros. */
export class GenreQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por estado activo/inactivo.' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
