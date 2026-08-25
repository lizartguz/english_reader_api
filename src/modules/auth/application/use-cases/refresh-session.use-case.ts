import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/constants/error-codes.constants';
import { AuthMessages } from '@/common/constants/messages.constants';
import { UserStatus } from '@/common/enums/domain.enums';
import type { RequestContext } from '@/common/utils/request-context.util';
import { UsersRepository } from '@/modules/users/infrastructure/persistence/users.repository';
import { extractRoleCodes, toAuthenticatedUserResponse } from '@/modules/users/domain/user-selects';
import { SessionRevokeReason, SessionService } from '../services/session.service';
import { TokenService } from '../services/token.service';
import type { RefreshSessionDto } from '../dto/token.dto';
import type { AuthSessionResponse } from '../dto/auth-response.dto';
import type { LoginResult } from './login.use-case';

/**
 * Renueva la sesión a partir de un refresh token válido.
 *
 * Cada renovación rota el token: el anterior queda revocado y apuntando al
 * nuevo. Si llega un token ya revocado se asume robo o clonación y se cierra
 * la sesión completa, en lugar de limitarse a rechazar esa solicitud.
 */
@Injectable()
export class RefreshSessionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersRepository: UsersRepository,
    private readonly sessionService: SessionService,
    private readonly tokenService: TokenService,
  ) {}

  async execute(
    refreshToken: string,
    dto: RefreshSessionDto,
    context: RequestContext,
  ): Promise<LoginResult> {
    const stored = await this.sessionService.findByToken(refreshToken);

    if (!stored) {
      throw AppException.unauthorized(AuthMessages.TokenInvalid, ErrorCode.TokenInvalid);
    }

    if (stored.revokedAt) {
      // Reutilización de un token ya consumido: se invalida toda la sesión.
      await this.sessionService.revokeSession(
        stored.sessionId,
        SessionRevokeReason.TokenReuseDetected,
      );

      // Se conserva el código `session_invalidated` para que los clientes lo
      // traten igual que una sesión cerrada, pero el mensaje refleja el motivo real.
      throw AppException.unauthorized(
        AuthMessages.SessionRevokedForSecurity,
        ErrorCode.SessionInvalidated,
      );
    }

    const now = Date.now();

    if (stored.expiresAt.getTime() <= now || stored.sessionExpiresAt.getTime() <= now) {
      throw AppException.unauthorized(AuthMessages.SessionExpired, ErrorCode.SessionExpired);
    }

    const user = await this.usersRepository.findByIdWithAccess(stored.userId);

    if (!user || user.status !== UserStatus.active) {
      await this.sessionService.revokeSession(stored.sessionId, SessionRevokeReason.AdminAction);

      throw AppException.unauthorized(AuthMessages.AccountInactive, ErrorCode.AccountInactive);
    }

    const issued = await this.prisma.runInTransaction((tx) =>
      this.sessionService.rotate(
        stored.id,
        stored.userId,
        stored.sessionId,
        stored.sessionExpiresAt,
        dto.device,
        context,
        tx,
      ),
    );

    const roles = extractRoleCodes(user);

    const { accessToken, expiresIn } = this.tokenService.signAccessToken(
      user.id,
      issued.sessionId,
      roles,
      issued.sessionExpiresAt,
    );

    const session: AuthSessionResponse = {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      sessionExpiresAt: issued.sessionExpiresAt,
      user: toAuthenticatedUserResponse(user),
    };

    return { session, refreshToken: issued.refreshToken, refreshExpiresAt: issued.expiresAt };
  }
}
