import { Injectable } from '@nestjs/common';
import { PrismaService, PrismaTransaction } from '@/database/prisma.service';
import { SortOrder } from '@/common/enums/sort-order.enum';
import { buildOrderBy } from '@/common/utils/pagination.util';
import { ROLE_SELECT } from '@/modules/roles/domain/role-mapper';
import {
  ROLE_SORT_FIELDS,
  type RoleSortField,
} from '@/modules/roles/application/dto/role-query.dto';

/** Acceso a datos de roles y su matriz de permisos. */
@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista roles paginados, con búsqueda por código o nombre. */
  async list(
    search: string | undefined,
    pagination: { skip: number; take: number },
    sort: { field?: string; order?: SortOrder },
  ) {
    const where = search
      ? { OR: [{ code: { contains: search } }, { name: { contains: search } }] }
      : {};

    const orderBy = buildOrderBy<RoleSortField>(sort.field, sort.order, ROLE_SORT_FIELDS, 'code');

    const [items, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
        select: ROLE_SELECT,
      }),
      this.prisma.role.count({ where }),
    ]);

    return { items, total };
  }

  findById(id: string, tx?: PrismaTransaction) {
    return (tx ?? this.prisma).role.findUnique({ where: { id }, select: ROLE_SELECT });
  }

  findByCode(code: string) {
    return this.prisma.role.findUnique({ where: { code }, select: { id: true } });
  }

  /** Cuenta los usuarios que aún tienen este rol asignado. */
  async countUsersWithRole(id: string): Promise<number> {
    return this.prisma.userRole.count({ where: { roleId: id } });
  }

  /** Crea un rol personalizado y le asigna sus permisos iniciales, si llegan. */
  async create(
    data: { code: string; name: string; description?: string | null },
    permissionIds: string[],
    tx: PrismaTransaction,
  ) {
    return tx.role.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        isSystem: false,
        permissions: { create: permissionIds.map((permissionId) => ({ permissionId })) },
      },
      select: ROLE_SELECT,
    });
  }

  updateInfo(id: string, data: Partial<{ name: string; description: string | null }>) {
    return this.prisma.role.update({ where: { id }, data, select: ROLE_SELECT });
  }

  /**
   * Reemplaza por completo los permisos de un rol dentro de una transacción,
   * para que la baja de los anteriores y el alta de los nuevos sean atómicas.
   */
  async replacePermissions(id: string, permissionIds: string[], tx: PrismaTransaction) {
    await tx.rolePermission.deleteMany({ where: { roleId: id } });

    if (permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        skipDuplicates: true,
      });
    }

    return tx.role.findUniqueOrThrow({ where: { id }, select: ROLE_SELECT });
  }

  /** Elimina el rol. No hay borrado lógico: los roles son un catálogo pequeño. */
  delete(id: string) {
    return this.prisma.role.delete({ where: { id } });
  }
}
