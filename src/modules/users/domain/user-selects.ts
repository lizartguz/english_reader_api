import type { Prisma } from '@/generated/prisma/client';
import { RoleCode, ADMINISTRATIVE_ROLES } from '@/common/enums/role-code.enum';
import type { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import type { AuthenticatedUserResponse } from '@/modules/auth/application/dto/auth-response.dto';
import type { UserAdminResponseDto } from '@/modules/users/application/dto/user-response.dto';

/**
 * Proyección estándar de un usuario junto con sus roles y permisos efectivos.
 *
 * Se define una sola vez para que autenticación, perfil y administración
 * devuelvan siempre la misma forma y no se filtre el `passwordHash` por error.
 */
export const USER_WITH_ACCESS_SELECT = {
  id: true,
  email: true,
  phoneNumber: true,
  firstName: true,
  lastName: true,
  status: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  roles: {
    select: {
      role: {
        select: {
          id: true,
          code: true,
          name: true,
          permissions: { select: { permission: { select: { code: true } } } },
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

/** Proyección para verificar credenciales; incluye el hash y el estado de bloqueo. */
export const USER_WITH_CREDENTIALS_SELECT = {
  ...USER_WITH_ACCESS_SELECT,
  passwordHash: true,
  failedLoginAttempts: true,
  lockedUntil: true,
} satisfies Prisma.UserSelect;

export type UserWithAccess = Prisma.UserGetPayload<{ select: typeof USER_WITH_ACCESS_SELECT }>;
export type UserWithCredentials = Prisma.UserGetPayload<{
  select: typeof USER_WITH_CREDENTIALS_SELECT;
}>;

/** Extrae los códigos de rol de un usuario. */
export function extractRoleCodes(user: UserWithAccess): string[] {
  return user.roles.map((entry) => entry.role.code);
}

/** Extrae los permisos efectivos, sin repetir, provenientes de todos sus roles. */
export function extractPermissionCodes(user: UserWithAccess): string[] {
  const codes = new Set<string>();

  for (const entry of user.roles) {
    for (const rolePermission of entry.role.permissions) {
      codes.add(rolePermission.permission.code);
    }
  }

  return [...codes];
}

/** Indica si el usuario tiene algún rol administrativo. */
export function hasAdministrativeRole(user: UserWithAccess): boolean {
  return extractRoleCodes(user).some((code) => ADMINISTRATIVE_ROLES.includes(code as RoleCode));
}

/** Indica si el usuario es super administrador. */
export function isSuperAdmin(user: UserWithAccess): boolean {
  return extractRoleCodes(user).includes(RoleCode.SuperAdmin);
}

/** Construye la identidad que viaja en la solicitud durante la autorización. */
export function toAuthenticatedUser(
  user: UserWithAccess,
  sessionId: string,
  sessionExpiresAt: Date,
): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status,
    roles: extractRoleCodes(user),
    permissions: extractPermissionCodes(user),
    sessionId,
    sessionExpiresAt,
  };
}

/** Construye la representación pública del usuario devuelta por la API. */
export function toAuthenticatedUserResponse(user: UserWithAccess): AuthenticatedUserResponse {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    status: user.status,
    phoneNumber: user.phoneNumber,
    roles: extractRoleCodes(user),
    permissions: extractPermissionCodes(user),
    emailVerifiedAt: user.emailVerifiedAt,
    lastLoginAt: user.lastLoginAt,
  };
}

/** Construye la representación administrativa de un usuario para el panel React. */
export function toUserAdminResponse(user: UserWithAccess): UserAdminResponseDto {
  return {
    ...toAuthenticatedUserResponse(user),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
