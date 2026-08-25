import type { Prisma } from '@/generated/prisma/client';
import type { RoleResponseDto } from '@/modules/roles/application/dto/role-response.dto';

/** Proyección de un rol junto con los códigos de sus permisos. */
export const ROLE_SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
  permissions: { select: { permission: { select: { code: true } } } },
} satisfies Prisma.RoleSelect;

export type RoleRow = Prisma.RoleGetPayload<{ select: typeof ROLE_SELECT }>;

/** Aplana la relación `permissions -> permission` a una lista de códigos. */
export function toRoleResponse(row: RoleRow): RoleResponseDto {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    isSystem: row.isSystem,
    permissions: row.permissions.map((entry) => entry.permission.code),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
