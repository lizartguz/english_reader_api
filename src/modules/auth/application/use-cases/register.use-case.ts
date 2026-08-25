import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database/prisma.service';
import { PasswordHasherService } from '@/common/security/password-hasher.service';
import { TokenHasherService } from '@/common/security/token-hasher.service';
import { AppException } from '@/common/exceptions/app.exception';
import { UserMessages } from '@/common/constants/messages.constants';
import { UserStatus } from '@/common/enums/domain.enums';
import { RoleCode } from '@/common/enums/role-code.enum';
import { addHours } from '@/common/utils/duration.util';
import type { RequestContext } from '@/common/utils/request-context.util';
import { MailService } from '@/modules/mail/mail.service';
import { UsersRepository } from '@/modules/users/infrastructure/persistence/users.repository';
import type { RegisterDto } from '../dto/register.dto';

/**
 * Registra un usuario cliente desde la aplicación.
 *
 * La cuenta se crea en estado `pending_verification` y solo se activa cuando el
 * usuario confirma su correo. El rol `CLIENT` se asigna en el servidor: nunca
 * se acepta un rol enviado por el cliente.
 */
@Injectable()
export class RegisterUseCase {
  private readonly verificationTtlHours: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersRepository: UsersRepository,
    private readonly passwordHasher: PasswordHasherService,
    private readonly tokenHasher: TokenHasherService,
    private readonly mailService: MailService,
    configService: ConfigService,
  ) {
    this.verificationTtlHours = configService.get<number>('verification.tokenTtlHours') ?? 24;
  }

  async execute(dto: RegisterDto, context: RequestContext): Promise<void> {
    if (await this.usersRepository.emailExists(dto.email)) {
      throw AppException.conflict(UserMessages.EmailAlreadyUsed, [
        { field: 'email', message: UserMessages.EmailAlreadyUsed },
      ]);
    }

    if (dto.phoneNumber && (await this.usersRepository.phoneExists(dto.phoneNumber))) {
      throw AppException.conflict(UserMessages.PhoneAlreadyUsed, [
        { field: 'phoneNumber', message: UserMessages.PhoneAlreadyUsed },
      ]);
    }

    const clientRole = await this.prisma.role.findUnique({
      where: { code: RoleCode.Client },
      select: { id: true },
    });

    if (!clientRole) {
      // Sin el rol base no es posible completar el alta; indica una base sin seeders.
      throw AppException.businessRule(UserMessages.RoleRequired);
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);
    const verificationToken = this.tokenHasher.generate();

    // Usuario, rol y token de verificación se crean en una sola transacción para
    // que nunca quede una cuenta sin rol o sin forma de activarse.
    await this.prisma.runInTransaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phoneNumber: dto.phoneNumber ?? null,
          status: UserStatus.pending_verification,
          roles: { create: { roleId: clientRole.id } },
        },
        select: { id: true },
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

    await this.mailService.sendEmailVerification(dto.email, dto.firstName, verificationToken);
  }
}
