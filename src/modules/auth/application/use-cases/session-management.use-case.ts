import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { PasswordHasherService } from '@/common/security/password-hasher.service';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/constants/error-codes.constants';
import { AuthMessages } from '@/common/constants/messages.constants';
import { AuditAction, AuditEntityType } from '@/common/constants/audit-actions.constants';
import { RoleCode, ADMIN_PANEL_ROLES } from '@/common/enums/role-code.enum';
import type { RequestContext } from '@/common/utils/request-context.util';
import type { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { AuditService } from '@/modules/audit/application/audit.service';
import { MailService } from '@/modules/mail/mail.service';
import { UsersRepository } from '@/modules/users/infrastructure/persistence/users.repository';
import { toAuthenticatedUserResponse } from '@/modules/users/domain/user-selects';
import { SessionRevokeReason, SessionService } from '../services/session.service';
import type { ChangePasswordDto } from '../dto/token.dto';
import type { AuthenticatedUserResponse, SessionStatusResponse } from '../dto/auth-response.dto';

/**
 * Cierra la sesión asociada al refresh token recibido.
 *
 * Se revoca la sesión completa y no solo el token vigente, para que ninguna
 * rotación pendiente pueda seguir renovando el acceso.
 */
@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    refreshToken: string | undefined,
    currentUser: AuthenticatedUser | undefined,
    context: RequestContext,
  ): Promise<void> {
    const sessionId = await this.resolveSessionId(refreshToken, currentUser);

    if (!sessionId) return;

    await this.sessionService.revokeSession(sessionId, SessionRevokeReason.Logout);

    const isAdministrative = currentUser?.roles.some((role) =>
      ADMIN_PANEL_ROLES.includes(role as RoleCode),
    );

    if (currentUser && isAdministrative) {
      await this.auditService.record({
        actorUserId: currentUser.id,
        action: AuditAction.AuthLogout,
        entityType: AuditEntityType.Session,
        entityId: sessionId,
        summary: `Cierre de sesión administrativo de ${currentUser.email}.`,
        context,
      });
    }
  }

  /**
   * Determina qué sesión cerrar.
   *
   * Se prioriza el refresh token porque identifica la sesión concreta del
   * dispositivo; el access token sirve como respaldo cuando la cookie ya no
   * está disponible.
   */
  private async resolveSessionId(
    refreshToken: string | undefined,
    currentUser: AuthenticatedUser | undefined,
  ): Promise<string | null> {
    if (refreshToken) {
      const stored = await this.sessionService.findByToken(refreshToken);
      if (stored) return stored.sessionId;
    }

    return currentUser?.sessionId ?? null;
  }
}

/**
 * Confirma que la sesión sigue vigente y devuelve el perfil actualizado.
 *
 * La aplicación Flutter la usa al arrancar: si la sesión fue invalidada desde
 * otro dispositivo, recibe `session_invalidated` y limpia su estado local.
 */
@Injectable()
export class VerifySessionUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(currentUser: AuthenticatedUser): Promise<SessionStatusResponse> {
    const user = await this.usersRepository.findByIdWithAccess(currentUser.id);

    if (!user) {
      throw AppException.unauthorized(AuthMessages.TokenInvalid, ErrorCode.TokenInvalid);
    }

    return {
      valid: true,
      sessionExpiresAt: currentUser.sessionExpiresAt,
      user: toAuthenticatedUserResponse(user),
    };
  }
}

/** Devuelve el perfil del usuario autenticado con sus roles y permisos. */
@Injectable()
export class GetProfileUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(userId: string): Promise<AuthenticatedUserResponse> {
    const user = await this.usersRepository.findByIdWithAccess(userId);

    if (!user) {
      throw AppException.unauthorized(AuthMessages.TokenInvalid, ErrorCode.TokenInvalid);
    }

    return toAuthenticatedUserResponse(user);
  }
}

/**
 * Cambia la contraseña de la propia cuenta.
 *
 * Se conserva la sesión actual y se cierran las demás: el usuario no queda
 * fuera de la aplicación desde la que hizo el cambio, pero cualquier otro
 * acceso abierto deja de ser válido.
 */
@Injectable()
export class ChangePasswordUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersRepository: UsersRepository,
    private readonly passwordHasher: PasswordHasherService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
  ) {}

  async execute(
    currentUser: AuthenticatedUser,
    dto: ChangePasswordDto,
    context: RequestContext,
  ): Promise<void> {
    const user = await this.usersRepository.findByIdWithCredentials(currentUser.id);

    if (!user) {
      throw AppException.unauthorized(AuthMessages.TokenInvalid, ErrorCode.TokenInvalid);
    }

    const matches = await this.passwordHasher.verify(dto.currentPassword, user.passwordHash);

    if (!matches) {
      throw AppException.businessRule(AuthMessages.CurrentPasswordInvalid, [
        { field: 'currentPassword', message: AuthMessages.CurrentPasswordInvalid },
      ]);
    }

    const passwordHash = await this.passwordHasher.hash(dto.newPassword);

    await this.prisma.runInTransaction(async (tx) => {
      await this.usersRepository.updatePassword(user.id, passwordHash, tx);

      await this.sessionService.revokeAllUserSessions(
        user.id,
        SessionRevokeReason.PasswordChanged,
        tx,
        currentUser.sessionId,
      );

      await this.auditService.record(
        {
          actorUserId: user.id,
          action: AuditAction.AuthPasswordChanged,
          entityType: AuditEntityType.User,
          entityId: user.id,
          summary: 'El usuario cambió su contraseña.',
          context,
        },
        tx,
      );
    });

    await this.mailService.sendPasswordChanged(user.email, user.firstName, 'change');
  }
}
