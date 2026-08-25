import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { SystemLogLevel } from '@/common/enums/domain.enums';

/** Campos permitidos para ordenar el listado de registros técnicos. */
export const SYSTEM_LOG_SORT_FIELDS = ['createdAt'] as const;
export type SystemLogSortField = (typeof SYSTEM_LOG_SORT_FIELDS)[number];

/** Filtros y paginación para consultar `system_logs`. Restringido a SUPER_ADMIN. */
export class SystemLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SystemLogLevel })
  @IsOptional()
  @IsEnum(SystemLogLevel, { message: 'El nivel del filtro no es válido.' })
  level?: SystemLogLevel;

  @ApiPropertyOptional({ example: 'http' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @ApiPropertyOptional({ example: 'external_provider_error' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  errorCode?: string;

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
