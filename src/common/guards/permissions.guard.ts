import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import { REQUIRED_PERMISSIONS_KEY } from '@/common/decorators/require-permissions.decorator';
import { PermissionCode } from '@/common/enums/permission.enum';
import { RoleCode } from '@/common/enums/role-code.enum';
import { AppException } from '@/common/exceptions/app.exception';
import { CommonMessages } from '@/common/constants/messages.constants';
import type { AuthenticatedRequest } from '@/common/types/authenticated-user.type';

/**
 * Verifica que el usuario autenticado tenga los permisos requeridos por la ruta.
 *
 * El rol raíz `SUPER_ADMIN` no se evalúa contra la matriz: por definición puede
 * ejecutar cualquier acción administrativa. Para el resto, basta con poseer uno
 * de los permisos declarados en el decorador.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<PermissionCode[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;

    if (!user) throw AppException.unauthorized();

    if (user.roles.includes(RoleCode.SuperAdmin)) return true;

    const hasPermission = required.some((permission) => user.permissions.includes(permission));

    if (!hasPermission) throw AppException.forbidden(CommonMessages.Forbidden);

    return true;
  }
}
