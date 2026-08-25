import { Injectable } from '@nestjs/common';
import { PrismaService, PrismaTransaction } from '@/database/prisma.service';
import { UserStatus } from '@/common/enums/domain.enums';
import { SortOrder } from '@/common/enums/sort-order.enum';
import { buildOrderBy } from '@/common/utils/pagination.util';
import {
  USER_WITH_ACCESS_SELECT,
  USER_WITH_CREDENTIALS_SELECT,
  type UserWithAccess,
  type UserWithCredentials,
} from '@/modules/users/domain/user-selects';
import {
  USER_ADMIN_SORT_FIELDS,
  type UserAdminSortField,
} from '@/modules/users/application/dto/user-query.dto';

/** Filtros soportados por el listado administrativo de usuarios. */
export interface UserFilters {
  search?: string;
  status?: UserStatus;
  roleCode?: string;
}

/**
 * Acceso a datos de usuarios.
 *
 * Todas las consultas excluyen los registros eliminados lógicamente salvo que
 * se indique lo contrario, para que ninguna capa superior tenga que recordarlo.
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Busca un usuario activo por correo, incluyendo credenciales para el login. */
  findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null> {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: USER_WITH_CREDENTIALS_SELECT,
    });
  }

  /** Busca un usuario por identificador, incluyendo roles y permisos. */
  findByIdWithAccess(id: string, tx?: PrismaTransaction): Promise<UserWithAccess | null> {
    return (tx ?? this.prisma).user.findFirst({
      where: { id, deletedAt: null },
      select: USER_WITH_ACCESS_SELECT,
    });
  }

  /** Busca un usuario por identificador incluyendo credenciales. */
  findByIdWithCredentials(id: string): Promise<UserWithCredentials | null> {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: USER_WITH_CREDENTIALS_SELECT,
    });
  }

  /** Indica si el correo ya está en uso por otro usuario vigente. */
  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const found = await this.prisma.user.findFirst({
      where: { email, deletedAt: null, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
      select: { id: true },
    });

    return found !== null;
  }

  /** Indica si el teléfono ya está en uso por otro usuario vigente. */
  async phoneExists(phoneNumber: string, excludeUserId?: string): Promise<boolean> {
    const found = await this.prisma.user.findFirst({
      where: {
        phoneNumber,
        deletedAt: null,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });

    return found !== null;
  }

  /** Registra un inicio de sesión exitoso y reinicia el contador de intentos fallidos. */
  async markSuccessfulLogin(userId: string, tx?: PrismaTransaction): Promise<void> {
    await (tx ?? this.prisma).user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  /**
   * Suma un intento fallido y bloquea la cuenta temporalmente al superar el
   * máximo permitido. El bloqueo es por tiempo, no definitivo, para no dejar
   * fuera al usuario legítimo tras un ataque dirigido.
   */
  async registerFailedLogin(
    userId: string,
    currentAttempts: number,
    maxAttempts: number,
    lockMinutes: number,
  ): Promise<void> {
    const attempts = currentAttempts + 1;
    const shouldLock = attempts >= maxAttempts;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: shouldLock ? 0 : attempts,
        lockedUntil: shouldLock ? new Date(Date.now() + lockMinutes * 60_000) : null,
      },
    });
  }

  /** Actualiza la contraseña del usuario dentro de la transacción indicada. */
  async updatePassword(
    userId: string,
    passwordHash: string,
    tx?: PrismaTransaction,
  ): Promise<void> {
    await (tx ?? this.prisma).user.update({
      where: { id: userId },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  /** Marca el correo como verificado y activa la cuenta. */
  async markEmailVerified(userId: string, tx?: PrismaTransaction): Promise<void> {
    await (tx ?? this.prisma).user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date(), status: UserStatus.active },
    });
  }

  /** Lista usuarios paginados para el panel administrativo. */
  async list(
    filters: UserFilters,
    pagination: { skip: number; take: number },
    sort: { field?: string; order?: SortOrder },
  ) {
    const where = this.buildWhere(filters);
    const orderBy = buildOrderBy<UserAdminSortField>(
      sort.field,
      sort.order,
      USER_ADMIN_SORT_FIELDS,
      'createdAt',
    );

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
        select: USER_WITH_ACCESS_SELECT,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Crea un usuario y le asigna sus roles iniciales dentro de la misma
   * transacción, tal como exige `04-logica-negocio.md` para evitar cuentas sin rol.
   */
  create(
    data: {
      email: string;
      passwordHash: string;
      firstName: string;
      lastName: string;
      phoneNumber?: string | null;
      status: UserStatus;
    },
    roleIds: string[],
    tx: PrismaTransaction,
  ): Promise<UserWithAccess> {
    return tx.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber ?? null,
        status: data.status,
        // Un usuario creado por un administrador ya queda verificado: no
        // pasa por el flujo de confirmación por correo del auto-registro.
        emailVerifiedAt: new Date(),
        roles: { create: roleIds.map((roleId) => ({ roleId })) },
      },
      select: USER_WITH_ACCESS_SELECT,
    });
  }

  /** Actualiza los datos básicos de perfil de un usuario. */
  updateProfile(
    id: string,
    data: Partial<{
      email: string;
      firstName: string;
      lastName: string;
      phoneNumber: string | null;
    }>,
  ): Promise<UserWithAccess> {
    return this.prisma.user.update({ where: { id }, data, select: USER_WITH_ACCESS_SELECT });
  }

  /** Cambia el estado de una cuenta (activa, inactiva o bloqueada). */
  changeStatus(id: string, status: UserStatus): Promise<UserWithAccess> {
    return this.prisma.user.update({
      where: { id },
      data: { status, ...(status !== UserStatus.blocked ? { lockedUntil: null } : {}) },
      select: USER_WITH_ACCESS_SELECT,
    });
  }

  /**
   * Reemplaza por completo los roles de un usuario dentro de una transacción,
   * para que la baja de los roles anteriores y el alta de los nuevos ocurran
   * de forma atómica.
   */
  async replaceRoles(
    id: string,
    roleIds: string[],
    tx: PrismaTransaction,
  ): Promise<UserWithAccess> {
    await tx.userRole.deleteMany({ where: { userId: id } });
    await tx.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId: id, roleId })),
      skipDuplicates: true,
    });

    return tx.user.findFirstOrThrow({ where: { id }, select: USER_WITH_ACCESS_SELECT });
  }

  /** Elimina lógicamente un usuario y revoca su acceso futuro. */
  softDelete(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: UserStatus.inactive },
    });
  }

  private buildWhere(filters: UserFilters) {
    return {
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.roleCode ? { roles: { some: { role: { code: filters.roleCode } } } } : {}),
      ...(filters.search
        ? {
            OR: [
              { email: { contains: filters.search } },
              { firstName: { contains: filters.search } },
              { lastName: { contains: filters.search } },
            ],
          }
        : {}),
    };
  }
}
