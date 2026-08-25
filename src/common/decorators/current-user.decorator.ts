import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from '@/common/types/authenticated-user.type';

/**
 * Inyecta el usuario autenticado en el controlador.
 *
 * Si la ruta está protegida, el guard ya resolvió la identidad; la excepción
 * solo protege contra un uso incorrecto del decorador en rutas públicas.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) throw AppException.unauthorized();

    return data ? user[data] : user;
  },
);
