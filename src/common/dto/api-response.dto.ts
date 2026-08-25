import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ErrorCode } from '@/common/constants/error-codes.constants';

/** Forma de la envoltura estándar de respuesta exitosa (solo documentación). */
export class ApiSuccessResponseDto<T = unknown> {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Operación completada.' })
  message!: string;

  @ApiProperty({ description: 'Recurso o colección solicitada.' })
  data!: T;

  @ApiPropertyOptional({
    description: 'Información complementaria como paginación o filtros aplicados.',
  })
  meta?: Record<string, unknown>;
}

/** Detalle de un error de validación o de negocio (solo documentación). */
export class ApiErrorDetailDto {
  @ApiPropertyOptional({ example: 'email' })
  field?: string;

  @ApiProperty({ example: 'El correo no es válido.' })
  message!: string;
}

/** Forma de la envoltura estándar de respuesta con error (solo documentación). */
export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success!: boolean;

  @ApiProperty({ example: 'No se pudo completar la operación.' })
  message!: string;

  @ApiProperty({ enum: ErrorCode, example: ErrorCode.ValidationFailed })
  code!: ErrorCode;

  @ApiProperty({ type: [ApiErrorDetailDto] })
  errors!: ApiErrorDetailDto[];
}

/** Metadatos de paginación (solo documentación). */
export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 135 })
  total!: number;

  @ApiProperty({ example: 7 })
  totalPages!: number;

  @ApiProperty({ example: true })
  hasNextPage!: boolean;

  @ApiProperty({ example: false })
  hasPreviousPage!: boolean;
}
