import { PaginationMeta } from '@/common/dto/api-result';
import { PAGINATION } from '@/common/constants/pagination.constants';
import { SortOrder } from '@/common/enums/sort-order.enum';

/** Parámetros ya normalizados listos para una consulta paginada. */
export interface NormalizedPagination {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

/** Ajusta página y límite a rangos seguros y calcula el desplazamiento. */
export function normalizePagination(page?: number, limit?: number): NormalizedPagination {
  const safePage = Math.max(1, Math.trunc(page ?? PAGINATION.DefaultPage));
  const safeLimit = Math.min(
    PAGINATION.MaxLimit,
    Math.max(PAGINATION.MinLimit, Math.trunc(limit ?? PAGINATION.DefaultLimit)),
  );

  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit, take: safeLimit };
}

/** Construye los metadatos de paginación devueltos en `meta`. */
export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && total > 0,
  };
}

/**
 * Traduce `sort` y `order` a una cláusula de ordenamiento de Prisma.
 *
 * Solo se aceptan campos incluidos en `allowedFields`; cualquier otro valor cae
 * al campo por defecto para evitar ordenamientos arbitrarios desde el cliente.
 */
export function buildOrderBy<T extends string>(
  sort: string | undefined,
  order: SortOrder | undefined,
  allowedFields: readonly T[],
  defaultField: T,
): Record<string, SortOrder> {
  const field = allowedFields.includes(sort as T) ? (sort as T) : defaultField;
  const direction = order === SortOrder.Asc ? SortOrder.Asc : SortOrder.Desc;

  return { [field]: direction };
}
