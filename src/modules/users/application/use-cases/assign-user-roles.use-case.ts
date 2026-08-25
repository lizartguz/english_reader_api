import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import { UserMessages } from '@/common/constants/messages.constants';
import { AuditAction, AuditEntityType } from '@/common/constants/audit-actions.constants';
import type { RequestContext } from '@/common/utils/request-context.util';
import type { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { AuditService } from '@/modules/audit/application/audit.service';
import { extractRoleCodes, toUserAdminResponse } from '@/modules/users/domain/user-selects';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { UserAccessPolicyService } from '../services/user-access-policy.service';
import type { AssignUserRolesDto } from '../dto/assign-user-roles.dto';

/**
 * Reemplaza por completo los roles de un usuario.
 *
 * Se valida tanto contra los roles que el usuario ya tenía (para no permitir
 * que un `ADMIN` sin `users.manage_admins` degrade a un administrador) como
 * contra los roles nuevos que se le quieren asignar (para no permitir que
 * ascienda a un cliente a `ADMIN`).
 */
@Injectable()
export class AssignUserRolesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: UsersRepository,
    private readonly accessPolicy: UserAccessPolicyService,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    id: string,
    dto: AssignUserRolesDto,
    actor: AuthenticatedUser,
    context: RequestContext,
  ) {
    const current = await this.repository.findByIdWithAccess(id);

    if (!current) throw AppException.notFound(UserMessages.NotFound);

    this.accessPolicy.assertCanManageTarget(actor, extractRoleCodes(current));
    this.accessPolicy.assertRolesAssignable(actor, dto.roleCodes);

    const roles = await this.prisma.role.findMany({
      where: { code: { in: dto.roleCodes } },
      select: { id: true },
    });

    if (roles.length !== new Set(dto.roleCodes).size) {
      throw AppException.businessRule(UserMessages.RoleRequired);
    }

    const updated = await this.prisma.runInTransaction((tx) =>
      this.repository.replaceRoles(
        id,
        roles.map((role) => role.id),
        tx,
      ),
    );

    await this.auditService.record({
      actorUserId: actor.id,
      action: AuditAction.UserRolesAssigned,
      entityType: AuditEntityType.User,
      entityId: id,
      summary: `Se asignaron los roles ${dto.roleCodes.join(', ')} a ${updated.email}.`,
      context,
    });

    return toUserAdminResponse(updated);
  }
}
