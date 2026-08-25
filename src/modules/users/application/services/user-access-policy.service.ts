import { Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { UserMessages } from '@/common/constants/messages.constants';
import { PermissionCode } from '@/common/enums/permission.enum';
import { RoleCode, ADMINISTRATIVE_ROLES } from '@/common/enums/role-code.enum';
import type { AuthenticatedUser } from '@/common/types/authenticated-user.type';

/**
 * Centraliza las reglas de quién puede gestionar a quién, según
 * `02-seguridad-autenticacion-autorizacion.md`:
 *
 * - Nadie salvo un `SUPER_ADMIN` puede tocar la cuenta de otro `SUPER_ADMIN`.
 * - Gestionar una cuenta con rol `ADMIN` o `SUPER_ADMIN` exige el permiso
 *   `users.manage_admins`, que solo tiene `SUPER_ADMIN` en la matriz inicial.
 * - Un `ADMIN` sin ese permiso solo puede gestionar usuarios `CLIENT`.
 */
@Injectable()
export class UserAccessPolicyService {
  /**
   * Verifica que el actor pueda operar sobre un usuario con los roles dados.
   * Debe llamarse antes de editar perfil, cambiar estado, reasignar roles o eliminar.
   */
  assertCanManageTarget(actor: AuthenticatedUser, targetRoleCodes: string[]): void {
    const targetIsSuperAdmin = targetRoleCodes.includes(RoleCode.SuperAdmin);
    const targetIsAdministrative = targetRoleCodes.some((code) =>
      ADMINISTRATIVE_ROLES.includes(code as RoleCode),
    );

    if (targetIsSuperAdmin && !actor.roles.includes(RoleCode.SuperAdmin)) {
      throw AppException.forbidden(UserMessages.CannotManageSuperAdmin);
    }

    if (targetIsAdministrative && !actor.permissions.includes(PermissionCode.UsersManageAdmins)) {
      throw AppException.forbidden(UserMessages.CannotManageAdmins);
    }
  }

  /**
   * Verifica que el actor pueda asignar la lista de roles solicitada.
   * Se evalúa aparte de `assertCanManageTarget` porque un `ADMIN` podría
   * intentar ascender a un cliente a `ADMIN`, sin que el usuario objetivo
   * tuviera previamente un rol administrativo.
   */
  assertRolesAssignable(actor: AuthenticatedUser, roleCodes: RoleCode[]): void {
    const grantsSuperAdmin = roleCodes.includes(RoleCode.SuperAdmin);
    const grantsAdministrative = roleCodes.some((code) => ADMINISTRATIVE_ROLES.includes(code));

    // Solo un SUPER_ADMIN puede crear a otro SUPER_ADMIN, más allá de permisos.
    if (grantsSuperAdmin && !actor.roles.includes(RoleCode.SuperAdmin)) {
      throw AppException.forbidden(UserMessages.CannotManageSuperAdmin);
    }

    if (grantsAdministrative && !actor.permissions.includes(PermissionCode.UsersManageAdmins)) {
      throw AppException.forbidden(UserMessages.CannotManageAdmins);
    }
  }
}
