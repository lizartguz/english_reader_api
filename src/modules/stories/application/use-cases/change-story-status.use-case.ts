import { Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { StoryMessages } from '@/common/constants/messages.constants';
import { AuditAction, AuditEntityType } from '@/common/constants/audit-actions.constants';
import { StoryStatus } from '@/common/enums/domain.enums';
import type { RequestContext } from '@/common/utils/request-context.util';
import { AuditService } from '@/modules/audit/application/audit.service';
import { ReadingLevelsRepository } from '@/modules/reading-levels/infrastructure/persistence/reading-levels.repository';
import { toStoryDetail } from '@/modules/stories/domain/story-mapper';
import { isStoryTransitionAllowed } from '@/modules/stories/domain/story-status-transitions';
import { StoriesRepository } from '../../infrastructure/persistence/stories.repository';

/**
 * Cambia el estado de publicación de una historia.
 *
 * Publicar exige que el nivel de lectura asociado esté activo, según
 * `04-logica-negocio.md`. `publishedAt` se fija la primera vez que la historia
 * entra en estado `published` y se conserva como registro histórico al
 * archivarla o volverla a borrador; solo se renueva si se vuelve a publicar
 * después de haber salido de ese estado.
 */
@Injectable()
export class ChangeStoryStatusUseCase {
  constructor(
    private readonly repository: StoriesRepository,
    private readonly readingLevelsRepository: ReadingLevelsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    id: string,
    targetStatus: StoryStatus,
    actorUserId: string,
    context: RequestContext,
  ) {
    const current = await this.repository.findStatusById(id);

    if (!current) throw AppException.notFound(StoryMessages.NotFound);

    if (!isStoryTransitionAllowed(current.status, targetStatus)) {
      throw AppException.conflict(StoryMessages.InvalidStatusTransition);
    }

    let publishedAt: Date | null | undefined;

    if (targetStatus === StoryStatus.published) {
      const readingLevel = await this.readingLevelsRepository.findById(current.readingLevelId);

      if (!readingLevel || !readingLevel.isActive) {
        throw AppException.businessRule(StoryMessages.CannotPublishWithoutActiveLevel);
      }

      // Solo se renueva la fecha si la historia no estaba ya publicada.
      publishedAt = current.status === StoryStatus.published ? undefined : new Date();
    }

    const updated = await this.repository.changeStatus(id, targetStatus, publishedAt, actorUserId);

    await this.auditService.record({
      actorUserId,
      action: AuditAction.StoryStatusChanged,
      entityType: AuditEntityType.Story,
      entityId: id,
      summary: `La historia "${current.title}" pasó de "${current.status}" a "${targetStatus}".`,
      metadata: { from: current.status, to: targetStatus },
      context,
    });

    return toStoryDetail(updated);
  }
}
