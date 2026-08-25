import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import { REQUIRED_ROLES_KEY } from '@/common/decorators/require-roles.decorator';
import { RoleCode } from '@/common/enums/role-code.enum';
import { AppException } from '@/common/exceptions/app.exception';
import { CommonMessages } from '@/common/constants/messages.constants';
import type { AuthenticatedRequest } from '@/common/types/authenticated-user.type';

/**
 * Restringe una ruta a determinados roles.
 *
 * Se usa para separar el contexto administrativo del contexto de la aplicación
 * cliente; el control por acción concreta corresponde a `PermissionsGuard`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<RoleCode[]>(REQUIRED_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;

    if (!user) throw AppException.unauthorized();

    const hasRole = required.some((role) => user.roles.includes(role));

    if (!hasRole) throw AppException.forbidden(CommonMessages.Forbidden);

    return true;
  }
}
