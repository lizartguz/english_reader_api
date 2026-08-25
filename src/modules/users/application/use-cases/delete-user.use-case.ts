import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import { UserMessages } from '@/common/constants/messages.constants';
import { AuditAction, AuditEntityType } from '@/common/constants/audit-actions.constants';
import { UserStatus } from '@/common/enums/domain.enums';
import type { RequestContext } from '@/common/utils/request-context.util';
import type { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { SessionRevokeReason } from '@/modules/auth/application/services/session.service';
import { AuditService } from '@/modules/audit/application/audit.service';
import { extractRoleCodes } from '@/modules/users/domain/user-selects';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { UserAccessPolicyService } from '../services/user-access-policy.service';

/** Elimina lógicamente un usuario y revoca sus sesiones activas. */
@Injectable()
export class DeleteUserUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: UsersRepository,
    private readonly accessPolicy: UserAccessPolicyService,
    private readonly auditService: AuditService,
  ) {}

  async execute(id: string, actor: AuthenticatedUser, context: RequestContext): Promise<void> {
    if (id === actor.id) {
      throw AppException.forbidden(UserMessages.CannotDeleteSelf);
    }

    const current = await this.repository.findByIdWithAccess(id);

    if (!current) throw AppException.notFound(UserMessages.NotFound);

    this.accessPolicy.assertCanManageTarget(actor, extractRoleCodes(current));

    await this.prisma.runInTransaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { deletedAt: new Date(), status: UserStatus.inactive },
      });

      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: SessionRevokeReason.AdminAction },
      });
    });

    await this.auditService.record({
      actorUserId: actor.id,
      action: AuditAction.UserDeleted,
      entityType: AuditEntityType.User,
      entityId: id,
      summary: `Se eliminó el usuario ${current.email}.`,
      context,
    });
  }
}
