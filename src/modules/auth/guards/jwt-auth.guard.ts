import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/database/prisma.service';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/constants/error-codes.constants';
import { AuthMessages, CommonMessages } from '@/common/constants/messages.constants';
import { UserStatus } from '@/common/enums/domain.enums';
import type { AuthenticatedRequest } from '@/common/types/authenticated-user.type';
import { USER_WITH_ACCESS_SELECT, toAuthenticatedUser } from '@/modules/users/domain/user-selects';
import { TokenService } from '../application/services/token.service';
import { SessionRevokeReason } from '../application/services/session.service';

/**
 * Verifica la identidad del solicitante y resuelve sus roles y permisos.
 *
 * Además de validar la firma del access token, comprueba contra la base que la
 * sesión siga viva. Esa consulta adicional es lo que permite que un cierre de
 * sesión o el ingreso desde otro dispositivo surtan efecto en la siguiente
 * solicitud, sin esperar a que expire el token; también hace que los cambios de
 * permisos se apliquen de inmediato.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    // En rutas públicas se resuelve la identidad si viene, pero nunca se exige.
    if (isPublic && !token) return true;

    if (!token) {
      throw AppException.unauthorized(CommonMessages.Unauthenticated, ErrorCode.Unauthenticated);
    }

    const payload = this.tokenService.verifyAccessToken(token);

    const session = await this.prisma.refreshToken.findFirst({
      where: { sessionId: payload.sid, revokedAt: null },
      select: { sessionExpiresAt: true, user: { select: USER_WITH_ACCESS_SELECT } },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      throw await this.buildInvalidSessionError(payload.sid);
    }

    if (session.sessionExpiresAt.getTime() <= Date.now()) {
      throw AppException.unauthorized(AuthMessages.SessionExpired, ErrorCode.SessionExpired);
    }

    const user = session.user;

    if (user.id !== payload.sub) {
      throw AppException.unauthorized(AuthMessages.TokenInvalid, ErrorCode.TokenInvalid);
    }

    if (user.deletedAt || user.status !== UserStatus.active) {
      throw AppException.unauthorized(AuthMessages.AccountInactive, ErrorCode.AccountInactive);
    }

    request.user = toAuthenticatedUser(user, payload.sid, session.sessionExpiresAt);

    return true;
  }

  /**
   * Construye un mensaje preciso cuando no queda ningún token activo para la
   * sesión, en lugar de asumir siempre que fue un inicio de sesión en otro
   * dispositivo. Es una consulta adicional, pero solo ocurre en la ruta de
   * error, nunca en el camino feliz de una solicitud autenticada.
   */
  private async buildInvalidSessionError(sessionId: string): Promise<AppException> {
    const lastToken = await this.prisma.refreshToken.findFirst({
      where: { sessionId },
      select: { revokedReason: true, user: { select: { status: true, deletedAt: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const status = lastToken?.user.status;

    if (lastToken?.user.deletedAt || status === UserStatus.blocked) {
      return AppException.unauthorized(AuthMessages.AccountBlocked, ErrorCode.AccountBlocked);
    }

    if (status === UserStatus.inactive) {
      return AppException.unauthorized(AuthMessages.AccountInactive, ErrorCode.AccountInactive);
    }

    if (lastToken?.revokedReason === SessionRevokeReason.TokenReuseDetected) {
      return AppException.unauthorized(
        AuthMessages.SessionRevokedForSecurity,
        ErrorCode.SessionInvalidated,
      );
    }

    if (lastToken?.revokedReason === SessionRevokeReason.PasswordChanged) {
      return AppException.unauthorized(
        AuthMessages.SessionRevokedPasswordChanged,
        ErrorCode.SessionInvalidated,
      );
    }

    return AppException.unauthorized(AuthMessages.SessionInvalidated, ErrorCode.SessionInvalidated);
  }

  /** Extrae el token del encabezado `Authorization: Bearer <token>`. */
  private extractBearerToken(request: AuthenticatedRequest): string | undefined {
    const header = request.headers.authorization;

    if (!header) return undefined;

    const [scheme, value] = header.split(' ');

    return scheme?.toLowerCase() === 'bearer' && value ? value : undefined;
  }
}
