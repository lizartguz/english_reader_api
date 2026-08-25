import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database/prisma.service';
import { PasswordHasherService } from '@/common/security/password-hasher.service';
import { TokenHasherService } from '@/common/security/token-hasher.service';
import { AppException } from '@/common/exceptions/app.exception';
import { AuthMessages } from '@/common/constants/messages.constants';
import { AuditAction, AuditEntityType } from '@/common/constants/audit-actions.constants';
import { UserStatus } from '@/common/enums/domain.enums';
import { addMinutes } from '@/common/utils/duration.util';
import type { RequestContext } from '@/common/utils/request-context.util';
import { AuditService } from '@/modules/audit/application/audit.service';
import { MailService } from '@/modules/mail/mail.service';
import { UsersRepository } from '@/modules/users/infrastructure/persistence/users.repository';
import { SessionRevokeReason, SessionService } from '../services/session.service';
import type { ForgotPasswordDto, ResetPasswordDto } from '../dto/token.dto';

/**
 * Inicia la recuperación de contraseña.
 *
 * La respuesta al cliente es siempre la misma, exista o no la cuenta, para no
 * revelar qué correos están registrados. Los tokens anteriores sin usar se
 * invalidan al emitir uno nuevo.
 */
@Injectable()
export class ForgotPasswordUseCase {
  private readonly tokenTtlMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenHasher: TokenHasherService,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
    configService: ConfigService,
  ) {
    this.tokenTtlMinutes = configService.get<number>('security.passwordResetTtlMinutes') ?? 30;
  }

  async execute(dto: ForgotPasswordDto, context: RequestContext): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
      select: { id: true, firstName: true, status: true },
    });

    // Las cuentas bloqueadas no deben poder restablecer su acceso por su cuenta.
    if (!user || user.status === UserStatus.blocked) return;

    const resetToken = this.tokenHasher.generate();

    await this.prisma.runInTransaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          email: dto.email,
          tokenHash: this.tokenHasher.hash(resetToken),
          expiresAt: addMinutes(new Date(), this.tokenTtlMinutes),
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
        },
      });

      await this.auditService.record(
        {
          actorUserId: user.id,
          action: AuditAction.AuthPasswordResetRequested,
          entityType: AuditEntityType.User,
          entityId: user.id,
          summary: 'Se solicitó restablecer la contraseña.',
          context,
        },
        tx,
      );
    });

    await this.mailService.sendPasswordReset(dto.email, user.firstName, resetToken);
  }
}

/**
 * Completa la recuperación estableciendo una contraseña nueva.
 *
 * Consume el token, actualiza la contraseña y cierra todas las sesiones
 * abiertas del usuario, porque un restablecimiento suele responder a un acceso
 * comprometido.
 */
@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersRepository: UsersRepository,
    private readonly passwordHasher: PasswordHasherService,
    private readonly tokenHasher: TokenHasherService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
  ) {}

  async execute(dto: ResetPasswordDto, context: RequestContext): Promise<void> {
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.tokenHasher.hash(dto.token) },
      select: {
        id: true,
        userId: true,
        usedAt: true,
        expiresAt: true,
        user: { select: { email: true, firstName: true } },
      },
    });

    if (
      !stored?.userId ||
      !stored.user ||
      stored.usedAt ||
      stored.expiresAt.getTime() <= Date.now()
    ) {
      throw AppException.businessRule(AuthMessages.PasswordResetTokenInvalid);
    }

    const userId = stored.userId;
    const passwordHash = await this.passwordHasher.hash(dto.password);

    await this.prisma.runInTransaction(async (tx) => {
      await tx.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      });

      await this.usersRepository.updatePassword(userId, passwordHash, tx);

      await this.sessionService.revokeAllUserSessions(
        userId,
        SessionRevokeReason.PasswordChanged,
        tx,
      );

      await this.auditService.record(
        {
          actorUserId: userId,
          action: AuditAction.AuthPasswordResetCompleted,
          entityType: AuditEntityType.User,
          entityId: userId,
          summary: 'La contraseña se restableció mediante el enlace de recuperación.',
          context,
        },
        tx,
      );
    });

    await this.mailService.sendPasswordChanged(stored.user.email, stored.user.firstName, 'reset');
  }
}
