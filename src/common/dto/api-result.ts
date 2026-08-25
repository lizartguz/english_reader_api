import { CommonMessages } from '@/common/constants/messages.constants';

/** Metadatos de paginación devueltos en `meta`. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Resultado que los controladores devuelven al interceptor de respuestas.
 *
 * Permite adjuntar un mensaje amigable y metadatos sin que cada controlador
 * tenga que construir manualmente la envoltura `{ success, message, data, meta }`.
 */
export class ApiResult<T> {
  constructor(
    readonly data: T,
    readonly message: string = CommonMessages.Success,
    readonly meta?: Record<string, unknown>,
  ) {}

  /** Resultado simple con datos y mensaje. */
  static of<T>(data: T, message: string = CommonMessages.Success): ApiResult<T> {
    return new ApiResult(data, message);
  }

  /** Resultado de una colección paginada, con `meta` de paginación. */
  static paginated<T>(
    items: T[],
    pagination: PaginationMeta,
    message: string = CommonMessages.Retrieved,
    extraMeta: Record<string, unknown> = {},
  ): ApiResult<T[]> {
    return new ApiResult(items, message, { pagination, ...extraMeta });
  }
}
