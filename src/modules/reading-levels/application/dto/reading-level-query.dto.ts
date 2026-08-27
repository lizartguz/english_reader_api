import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { toBoolean } from '@/common/utils/transform.util';

/** Campos permitidos para ordenar el listado de niveles de lectura. */
export const READING_LEVEL_SORT_FIELDS = ['createdAt', 'sortOrder', 'code', 'name'] as const;
export type ReadingLevelSortField = (typeof READING_LEVEL_SORT_FIELDS)[number];

/** Filtros y paginación para el listado administrativo de niveles de lectura. */
export class ReadingLevelQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por estado activo/inactivo.' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;
}
