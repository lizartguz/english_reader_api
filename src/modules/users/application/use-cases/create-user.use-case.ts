import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { PasswordHasherService } from '@/common/security/password-hasher.service';
import { AppException } from '@/common/exceptions/app.exception';
import { UserMessages } from '@/common/constants/messages.constants';
import { AuditAction, AuditEntityType } from '@/common/constants/audit-actions.constants';
import { UserStatus } from '@/common/enums/domain.enums';
import type { RequestContext } from '@/common/utils/request-context.util';
import type { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { AuditService } from '@/modules/audit/application/audit.service';
import { toUserAdminResponse } from '@/modules/users/domain/user-selects';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { UserAccessPolicyService } from '../services/user-access-policy.service';
import type { CreateUserDto } from '../dto/create-user.dto';

/**
 * Crea un usuario desde el panel administrativo.
 *
 * La creación y la asignación de roles ocurren en una misma transacción, como
 * exige la planificación para evitar cuentas creadas sin rol.
 */
@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: UsersRepository,
    private readonly passwordHasher: PasswordHasherService,
    private readonly accessPolicy: UserAccessPolicyService,
    private readonly auditService: AuditService,
  ) {}

  async execute(dto: CreateUserDto, actor: AuthenticatedUser, context: RequestContext) {
    this.accessPolicy.assertRolesAssignable(actor, dto.roleCodes);

    if (await this.repository.emailExists(dto.email)) {
      throw AppException.conflict(UserMessages.EmailAlreadyUsed, [
        { field: 'email', message: UserMessages.EmailAlreadyUsed },
      ]);
    }

    if (dto.phoneNumber && (await this.repository.phoneExists(dto.phoneNumber))) {
      throw AppException.conflict(UserMessages.PhoneAlreadyUsed, [
        { field: 'phoneNumber', message: UserMessages.PhoneAlreadyUsed },
      ]);
    }

    const roles = await this.prisma.role.findMany({
      where: { code: { in: dto.roleCodes } },
      select: { id: true },
    });

    if (roles.length !== new Set(dto.roleCodes).size) {
      throw AppException.businessRule(UserMessages.RoleRequired);
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);

    const created = await this.prisma.runInTransaction((tx) =>
      this.repository.create(
        {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phoneNumber: dto.phoneNumber ?? null,
          status: UserStatus.active,
        },
        roles.map((role) => role.id),
        tx,
      ),
    );

    await this.auditService.record({
      actorUserId: actor.id,
      action: AuditAction.UserCreated,
      entityType: AuditEntityType.User,
      entityId: created.id,
      summary: `Se creó el usuario ${created.email} con roles ${dto.roleCodes.join(', ')}.`,
      context,
    });

    return toUserAdminResponse(created);
  }
}
