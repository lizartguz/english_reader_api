import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

/** Campos permitidos para ordenar el listado de auditoría. */
export const AUDIT_LOG_SORT_FIELDS = ['createdAt'] as const;
export type AuditLogSortField = (typeof AUDIT_LOG_SORT_FIELDS)[number];

/** Filtros y paginación para consultar la auditoría administrativa. */
export class AuditLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'El usuario del filtro no es válido.' })
  actorUserId?: string;

  @ApiPropertyOptional({ example: 'story.created' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  action?: string;

  @ApiPropertyOptional({ example: 'Story' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityType?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'El identificador de entidad del filtro no es válido.' })
  entityId?: string;

  @ApiPropertyOptional({ description: 'Fecha mínima (ISO 8601).' })
  @IsOptional()
  @Type(() => String)
  @IsDateString({}, { message: 'La fecha inicial no es válida.' })
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Fecha máxima (ISO 8601).' })
  @IsOptional()
  @Type(() => String)
  @IsDateString({}, { message: 'La fecha final no es válida.' })
  dateTo?: string;
}
