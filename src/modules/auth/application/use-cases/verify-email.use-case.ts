import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database/prisma.service';
import { TokenHasherService } from '@/common/security/token-hasher.service';
import { AppException } from '@/common/exceptions/app.exception';
import { AuthMessages } from '@/common/constants/messages.constants';
import { UserStatus } from '@/common/enums/domain.enums';
import { addHours } from '@/common/utils/duration.util';
import type { RequestContext } from '@/common/utils/request-context.util';
import { MailService } from '@/modules/mail/mail.service';
import { UsersRepository } from '@/modules/users/infrastructure/persistence/users.repository';
import type { ResendVerificationDto, VerifyEmailDto } from '../dto/token.dto';

/**
 * Confirma el correo de una cuenta recién registrada y la activa.
 *
 * El token es de un solo uso: se marca como consumido dentro de la misma
 * transacción que activa la cuenta, de modo que un reenvío del mismo enlace no
 * pueda reactivar una cuenta desactivada más adelante.
 */
@Injectable()
export class VerifyEmailUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersRepository: UsersRepository,
    private readonly tokenHasher: TokenHasherService,
  ) {}

  async execute(dto: VerifyEmailDto): Promise<void> {
    const stored = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash: this.tokenHasher.hash(dto.token) },
      select: { id: true, userId: true, usedAt: true, expiresAt: true },
    });

    if (!stored || stored.usedAt || stored.expiresAt.getTime() <= Date.now()) {
      throw AppException.businessRule(AuthMessages.EmailVerificationTokenInvalid);
    }

    await this.prisma.runInTransaction(async (tx) => {
      const consumed = await tx.emailVerificationToken.updateMany({
        where: { id: stored.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });

      const verified = await this.usersRepository.markEmailVerified(stored.userId, tx);

      if (consumed.count !== 1 || !verified) {
        throw AppException.businessRule(AuthMessages.EmailVerificationTokenInvalid);
      }
    });
  }
}

/**
 * Reenvía el correo de verificación.
 *
 * Responde siempre igual, exista o no la cuenta, para no permitir enumerar
 * correos registrados. Al emitir un token nuevo invalida los anteriores.
 */
@Injectable()
export class ResendVerificationUseCase {
  private readonly verificationTtlHours: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenHasher: TokenHasherService,
    private readonly mailService: MailService,
    configService: ConfigService,
  ) {
    this.verificationTtlHours = configService.get<number>('verification.tokenTtlHours') ?? 24;
  }

  async execute(dto: ResendVerificationDto, context: RequestContext): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null, status: UserStatus.pending_verification },
      select: { id: true, firstName: true },
    });

    if (!user) return;

    const verificationToken = this.tokenHasher.generate();

    await this.prisma.runInTransaction(async (tx) => {
      await tx.emailVerificationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          email: dto.email,
          tokenHash: this.tokenHasher.hash(verificationToken),
          expiresAt: addHours(new Date(), this.verificationTtlHours),
          ipAddress: context.ipAddress ?? null,
          userAgent: context.userAgent ?? null,
        },
      });
    });

    await this.mailService.sendEmailVerification(dto.email, user.firstName, verificationToken);
  }
}
