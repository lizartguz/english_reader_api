import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database/prisma.service';
import { PasswordHasherService } from '@/common/security/password-hasher.service';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/constants/error-codes.constants';
import { AuthMessages } from '@/common/constants/messages.constants';
import { AuditAction, AuditEntityType } from '@/common/constants/audit-actions.constants';
import { UserStatus } from '@/common/enums/domain.enums';
import { ClientType } from '@/common/enums/client-type.enum';
import { RoleCode, ADMIN_PANEL_ROLES } from '@/common/enums/role-code.enum';
import type { RequestContext } from '@/common/utils/request-context.util';
import { AuditService } from '@/modules/audit/application/audit.service';
import { UsersRepository } from '@/modules/users/infrastructure/persistence/users.repository';
import {
  extractRoleCodes,
  toAuthenticatedUserResponse,
  type UserWithCredentials,
} from '@/modules/users/domain/user-selects';
import { SessionRevokeReason, SessionService } from '../services/session.service';
import { TokenService } from '../services/token.service';
import type { LoginDto } from '../dto/login.dto';
import type { AuthSessionResponse } from '../dto/auth-response.dto';

/** Sesión emitida junto con el refresh token en claro para el transporte elegido. */
export interface LoginResult {
  session: AuthSessionResponse;
  refreshToken: string;
  refreshExpiresAt: Date;
}

/**
 * Valida credenciales y emite una sesión activa.
 *
 * Aplica, en este orden: bloqueo por intentos fallidos, verificación de
 * contraseña, estado de la cuenta, acceso al contexto solicitado y política de
 * un solo dispositivo para usuarios cliente.
 */
@Injectable()
export class LoginUseCase {
  private readonly maxFailedAttempts: number;
  private readonly lockMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersRepository: UsersRepository,
    private readonly passwordHasher: PasswordHasherService,
    private readonly sessionService: SessionService,
    private readonly tokenService: TokenService,
    private readonly auditService: AuditService,
    configService: ConfigService,
  ) {
    this.maxFailedAttempts = configService.get<number>('security.loginMaxFailedAttempts') ?? 5;
    this.lockMinutes = configService.get<number>('security.loginLockMinutes') ?? 15;
  }

  async execute(dto: LoginDto, context: RequestContext): Promise<LoginResult> {
    const user = await this.usersRepository.findByEmailWithCredentials(dto.email);

    if (!user) {
      // Mismo error que una contraseña incorrecta: no se revela si el correo existe.
      throw AppException.unauthorized(
        AuthMessages.InvalidCredentials,
        ErrorCode.InvalidCredentials,
      );
    }

    this.assertNotLocked(user);
    await this.assertPasswordMatches(dto.password, user);
    this.assertUsableStatus(user);

    const roles = extractRoleCodes(user);
    this.assertContextAllowed(roles, dto.clientType);

    const isAdministrative = roles.some((role) => ADMIN_PANEL_ROLES.includes(role as RoleCode));
    const sessionExpiresAt = this.sessionService.calculateSessionExpiry(isAdministrative);

    // Un usuario cliente solo puede mantener una sesión activa a la vez.
    if (roles.includes(RoleCode.Client)) {
      await this.sessionService.revokeAllUserSessions(user.id, SessionRevokeReason.NewDeviceLogin);
    }

    const issued = await this.prisma.runInTransaction(async (tx) => {
      await this.usersRepository.markSuccessfulLogin(user.id, tx);

      const session = await this.sessionService.createSession(
        user.id,
        sessionExpiresAt,
        dto.device,
        context,
        tx,
      );

      // Solo se audita el acceso administrativo: los ingresos de clientes son
      // rutinarios y saturarían la auditoría funcional sin aportar trazabilidad.
      if (isAdministrative) {
        await this.auditService.record(
          {
            actorUserId: user.id,
            action: AuditAction.AuthLogin,
            entityType: AuditEntityType.Session,
            entityId: session.sessionId,
            summary: `Inicio de sesión administrativo de ${user.email}.`,
            metadata: { clientType: dto.clientType, platform: dto.device?.platform ?? null },
            context,
          },
          tx,
        );
      }

      return session;
    });

    const { accessToken, expiresIn } = this.tokenService.signAccessToken(
      user.id,
      issued.sessionId,
      roles,
      sessionExpiresAt,
    );

    return {
      session: {
        accessToken,
        tokenType: 'Bearer',
        expiresIn,
        sessionExpiresAt,
        user: toAuthenticatedUserResponse({ ...user, lastLoginAt: new Date() }),
      },
      refreshToken: issued.refreshToken,
      refreshExpiresAt: issued.expiresAt,
    };
  }

  /** Rechaza el acceso mientras la cuenta siga bloqueada por intentos fallidos. */
  private assertNotLocked(user: UserWithCredentials): void {
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw AppException.unauthorized(AuthMessages.AccountLocked, ErrorCode.AccountLocked);
    }
  }

  /** Verifica la contraseña y contabiliza el intento cuando falla. */
  private async assertPasswordMatches(
    plainPassword: string,
    user: UserWithCredentials,
  ): Promise<void> {
    const matches = await this.passwordHasher.verify(plainPassword, user.passwordHash);

    if (matches) return;

    await this.usersRepository.registerFailedLogin(
      user.id,
      user.failedLoginAttempts,
      this.maxFailedAttempts,
      this.lockMinutes,
    );

    throw AppException.unauthorized(AuthMessages.InvalidCredentials, ErrorCode.InvalidCredentials);
  }

  /**
   * Solo las cuentas activas pueden abrir sesión.
   *
   * Se distingue la cuenta pendiente de confirmación para que la aplicación
   * pueda ofrecer el reenvío del correo en lugar de pedir contactar al
   * administrador, que sería una salida sin recorrido para el usuario.
   */
  private assertUsableStatus(user: UserWithCredentials): void {
    if (user.status === UserStatus.active) return;

    if (user.status === UserStatus.blocked) {
      throw AppException.unauthorized(AuthMessages.AccountBlocked, ErrorCode.AccountBlocked);
    }

    if (user.status === UserStatus.pending_verification) {
      throw AppException.unauthorized(AuthMessages.EmailNotVerified, ErrorCode.EmailNotVerified);
    }

    throw AppException.unauthorized(AuthMessages.AccountInactive, ErrorCode.AccountInactive);
  }

  /**
   * Verifica que el usuario pueda entrar al contexto solicitado.
   *
   * El panel administrativo exige rol admin; Readeriz Web exige rol cliente.
   */
  private assertContextAllowed(roles: string[], clientType: ClientType): void {
    if (clientType === ClientType.Web) {
      const canEnterPanel = roles.some((role) => ADMIN_PANEL_ROLES.includes(role as RoleCode));
      if (canEnterPanel) return;
      throw AppException.forbidden(AuthMessages.AdminAreaForbidden);
    }

    if (clientType === ClientType.AppWeb && !roles.includes(RoleCode.Client)) {
      throw AppException.forbidden(AuthMessages.ClientAreaForbidden);
    }
  }
}
