import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { toBoolean } from '@/common/utils/transform.util';

/** Campos permitidos para ordenar el listado de roles. */
export const ROLE_SORT_FIELDS = ['createdAt', 'code', 'name'] as const;
export type RoleSortField = (typeof ROLE_SORT_FIELDS)[number];

/** Paginación, búsqueda y filtros para el listado administrativo de roles. */
export class RoleQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtra entre roles base del sistema y personalizados.' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: 'El filtro de rol del sistema debe ser verdadero o falso.' })
  isSystem?: boolean;
}
