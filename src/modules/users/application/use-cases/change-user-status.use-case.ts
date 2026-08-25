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
import { extractRoleCodes, toUserAdminResponse } from '@/modules/users/domain/user-selects';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { UserAccessPolicyService } from '../services/user-access-policy.service';
import type { ChangeUserStatusDto } from '../dto/change-user-status.dto';

/**
 * Cambia el estado de una cuenta.
 *
 * Nadie puede cambiar el estado de su propia cuenta, y sacar a un usuario de
 * `active` cierra de inmediato todas sus sesiones activas: bloquear o
 * desactivar una cuenta no debe convivir con un acceso ya abierto.
 */
@Injectable()
export class ChangeUserStatusUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: UsersRepository,
    private readonly accessPolicy: UserAccessPolicyService,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    id: string,
    dto: ChangeUserStatusDto,
    actor: AuthenticatedUser,
    context: RequestContext,
  ) {
    if (id === actor.id) {
      throw AppException.forbidden(UserMessages.CannotModifySelfStatus);
    }

    const current = await this.repository.findByIdWithAccess(id);

    if (!current) throw AppException.notFound(UserMessages.NotFound);

    this.accessPolicy.assertCanManageTarget(actor, extractRoleCodes(current));

    const updated = await this.prisma.runInTransaction(async (tx) => {
      const result = await tx.user.update({
        where: { id },
        data: {
          status: dto.status,
          ...(dto.status !== UserStatus.blocked ? { lockedUntil: null } : {}),
        },
        select: { id: true },
      });

      if (dto.status !== UserStatus.active) {
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date(), revokedReason: SessionRevokeReason.AdminAction },
        });
      }

      return this.repository.findByIdWithAccess(result.id, tx);
    });

    if (!updated) throw AppException.notFound(UserMessages.NotFound);

    await this.auditService.record({
      actorUserId: actor.id,
      action: AuditAction.UserStatusChanged,
      entityType: AuditEntityType.User,
      entityId: id,
      summary: `El usuario ${current.email} pasó de estado "${current.status}" a "${dto.status}".`,
      metadata: { from: current.status, to: dto.status },
      context,
    });

    return toUserAdminResponse(updated);
  }
}
