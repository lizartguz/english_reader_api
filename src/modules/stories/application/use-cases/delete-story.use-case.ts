import { Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { StoryMessages } from '@/common/constants/messages.constants';
import { AuditAction, AuditEntityType } from '@/common/constants/audit-actions.constants';
import type { RequestContext } from '@/common/utils/request-context.util';
import { AuditService } from '@/modules/audit/application/audit.service';
import { StoriesRepository } from '../../infrastructure/persistence/stories.repository';

/** Elimina lógicamente una historia. */
@Injectable()
export class DeleteStoryUseCase {
  constructor(
    private readonly repository: StoriesRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(id: string, actorUserId: string, context: RequestContext): Promise<void> {
    const current = await this.repository.findStatusById(id);

    if (!current) throw AppException.notFound(StoryMessages.NotFound);

    await this.repository.softDelete(id);

    await this.auditService.record({
      actorUserId,
      action: AuditAction.StoryDeleted,
      entityType: AuditEntityType.Story,
      entityId: id,
      summary: `Se eliminó la historia "${current.title}".`,
      context,
    });
  }
}
