import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

/** Campos permitidos para ordenar el listado de roles. */
export const ROLE_SORT_FIELDS = ['createdAt', 'code', 'name'] as const;
export type RoleSortField = (typeof ROLE_SORT_FIELDS)[number];

/** Paginación y búsqueda para el listado administrativo de roles. */
export class RoleQueryDto extends PaginationQueryDto {}
