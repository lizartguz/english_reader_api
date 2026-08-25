import { Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { UserMessages } from '@/common/constants/messages.constants';
import { AuditAction, AuditEntityType } from '@/common/constants/audit-actions.constants';
import type { RequestContext } from '@/common/utils/request-context.util';
import type { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { AuditService } from '@/modules/audit/application/audit.service';
import { extractRoleCodes, toUserAdminResponse } from '@/modules/users/domain/user-selects';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { UserAccessPolicyService } from '../services/user-access-policy.service';
import type { UpdateUserDto } from '../dto/update-user.dto';

/** Actualiza el perfil básico de un usuario. */
@Injectable()
export class UpdateUserUseCase {
  constructor(
    private readonly repository: UsersRepository,
    private readonly accessPolicy: UserAccessPolicyService,
    private readonly auditService: AuditService,
  ) {}

  async execute(id: string, dto: UpdateUserDto, actor: AuthenticatedUser, context: RequestContext) {
    const current = await this.repository.findByIdWithAccess(id);

    if (!current) throw AppException.notFound(UserMessages.NotFound);

    this.accessPolicy.assertCanManageTarget(actor, extractRoleCodes(current));

    if (dto.email && dto.email !== current.email) {
      if (await this.repository.emailExists(dto.email, id)) {
        throw AppException.conflict(UserMessages.EmailAlreadyUsed, [
          { field: 'email', message: UserMessages.EmailAlreadyUsed },
        ]);
      }
    }

    const updated = await this.repository.updateProfile(id, {
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
      ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
      ...(dto.phoneNumber !== undefined ? { phoneNumber: dto.phoneNumber } : {}),
    });

    await this.auditService.record({
      actorUserId: actor.id,
      action: AuditAction.UserUpdated,
      entityType: AuditEntityType.User,
      entityId: id,
      summary: `Se actualizó el perfil del usuario ${updated.email}.`,
      context,
    });

    return toUserAdminResponse(updated);
  }
}
