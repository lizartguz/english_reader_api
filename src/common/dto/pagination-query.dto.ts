import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Max, Min } from 'class-validator';
import { PAGINATION } from '@/common/constants/pagination.constants';
import { SortOrder } from '@/common/enums/sort-order.enum';
import { trimText } from '@/common/utils/transform.util';

/**
 * Parámetros comunes de paginación, búsqueda y ordenamiento.
 *
 * Cada módulo debe extender esta clase para declarar qué campos admite en
 * `sort`; el valor recibido siempre se valida contra una lista permitida en el
 * caso de uso correspondiente.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Página solicitada, comenzando en 1.', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero.' })
  @Min(1, { message: 'La página mínima es 1.' })
  page: number = PAGINATION.DefaultPage;

  @ApiPropertyOptional({
    description: 'Cantidad de registros por página.',
    default: PAGINATION.DefaultLimit,
    maximum: PAGINATION.MaxLimit,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero.' })
  @Min(PAGINATION.MinLimit, { message: `El límite mínimo es ${PAGINATION.MinLimit}.` })
  @Max(PAGINATION.MaxLimit, { message: `El límite máximo es ${PAGINATION.MaxLimit}.` })
  limit: number = PAGINATION.DefaultLimit;

  @ApiPropertyOptional({ description: 'Texto libre de búsqueda.' })
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'La búsqueda no puede superar los 150 caracteres.' })
  @Transform(trimText)
  search?: string;

  @ApiPropertyOptional({ description: 'Campo por el cual ordenar el listado.' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sort?: string;

  @ApiPropertyOptional({ description: 'Dirección del ordenamiento.', enum: SortOrder })
  @IsOptional()
  @IsEnum(SortOrder, { message: 'El orden debe ser `asc` o `desc`.' })
  order: SortOrder = SortOrder.Desc;
}
