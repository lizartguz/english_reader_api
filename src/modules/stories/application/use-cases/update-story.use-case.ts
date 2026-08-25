import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import {
  GenreMessages,
  ReadingLevelMessages,
  StoryMessages,
} from '@/common/constants/messages.constants';
import { AuditAction, AuditEntityType } from '@/common/constants/audit-actions.constants';
import type { RequestContext } from '@/common/utils/request-context.util';
import { AuditService } from '@/modules/audit/application/audit.service';
import { ReadingLevelsRepository } from '@/modules/reading-levels/infrastructure/persistence/reading-levels.repository';
import { GenresRepository } from '@/modules/genres/infrastructure/persistence/genres.repository';
import { toStoryDetail } from '@/modules/stories/domain/story-mapper';
import { StoriesRepository } from '../../infrastructure/persistence/stories.repository';
import type { UpdateStoryDto } from '../dto/update-story.dto';

/**
 * Actualiza una historia existente.
 *
 * Cuando llega `genreIds`, la lista de géneros se reemplaza por completo dentro
 * de la misma transacción que el resto de los campos.
 */
@Injectable()
export class UpdateStoryUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: StoriesRepository,
    private readonly readingLevelsRepository: ReadingLevelsRepository,
    private readonly genresRepository: GenresRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(id: string, dto: UpdateStoryDto, actorUserId: string, context: RequestContext) {
    const current = await this.repository.findById(id);

    if (!current) throw AppException.notFound(StoryMessages.NotFound);

    if (dto.readingLevelId) {
      const readingLevel = await this.readingLevelsRepository.findById(dto.readingLevelId);

      if (!readingLevel) {
        throw AppException.businessRule(ReadingLevelMessages.NotFound, [
          { field: 'readingLevelId', message: ReadingLevelMessages.NotFound },
        ]);
      }
    }

    if (dto.slug && dto.slug !== current.slug) {
      const existing = await this.repository.findBySlug(dto.slug, id);

      if (existing) {
        throw AppException.conflict(StoryMessages.SlugAlreadyUsed, [
          { field: 'slug', message: StoryMessages.SlugAlreadyUsed },
        ]);
      }
    }

    if (dto.genreIds && dto.genreIds.length > 0) {
      await this.validateGenres(dto.genreIds);
    }

    const updated = await this.prisma.runInTransaction((tx) =>
      this.repository.update(
        id,
        {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
          ...(dto.readingLevelId !== undefined ? { readingLevelId: dto.readingLevelId } : {}),
          ...(dto.author !== undefined ? { author: dto.author } : {}),
          ...(dto.summary !== undefined ? { summary: dto.summary } : {}),
          ...(dto.content !== undefined ? { content: dto.content } : {}),
          ...(dto.estimatedReadingMinutes !== undefined
            ? { estimatedReadingMinutes: dto.estimatedReadingMinutes }
            : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          updatedByUserId: actorUserId,
        },
        dto.genreIds,
        tx,
      ),
    );

    await this.auditService.record({
      actorUserId,
      action: AuditAction.StoryUpdated,
      entityType: AuditEntityType.Story,
      entityId: updated.id,
      summary: `Se actualizó la historia "${updated.title}".`,
      context,
    });

    return toStoryDetail(updated);
  }

  /** Verifica que todos los géneros enviados existan y estén vigentes. */
  private async validateGenres(genreIds: string[]): Promise<void> {
    const found = await this.prisma.runInTransaction((tx) =>
      this.genresRepository.findManyActiveByIds(genreIds, tx),
    );

    if (found.length !== new Set(genreIds).size) {
      throw AppException.businessRule(GenreMessages.UnknownGenre, [
        { field: 'genreIds', message: GenreMessages.UnknownGenre },
      ]);
    }
  }
}
