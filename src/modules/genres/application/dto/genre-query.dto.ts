import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { toBoolean } from '@/common/utils/transform.util';

/** Campos permitidos para ordenar el listado de géneros. */
export const GENRE_SORT_FIELDS = ['createdAt', 'sortOrder', 'code', 'name'] as const;
export type GenreSortField = (typeof GENRE_SORT_FIELDS)[number];

/** Filtros y paginación para el listado administrativo de géneros. */
export class GenreQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por estado activo/inactivo.' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: 'El filtro de estado activo debe ser verdadero o falso.' })
  isActive?: boolean;
}
