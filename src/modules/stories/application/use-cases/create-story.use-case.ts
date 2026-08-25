import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import { GenreMessages, ReadingLevelMessages } from '@/common/constants/messages.constants';
import { AuditAction, AuditEntityType } from '@/common/constants/audit-actions.constants';
import { buildSlug, buildSlugWithSuffix } from '@/common/utils/slug.util';
import type { RequestContext } from '@/common/utils/request-context.util';
import { AuditService } from '@/modules/audit/application/audit.service';
import { ReadingLevelsRepository } from '@/modules/reading-levels/infrastructure/persistence/reading-levels.repository';
import { GenresRepository } from '@/modules/genres/infrastructure/persistence/genres.repository';
import { toStoryDetail } from '@/modules/stories/domain/story-mapper';
import { StoriesRepository } from '../../infrastructure/persistence/stories.repository';
import type { CreateStoryDto } from '../dto/create-story.dto';

/**
 * Crea una historia en estado borrador.
 *
 * La historia y la asignación de géneros se guardan en una misma transacción,
 * como exige `04-logica-negocio.md` para historias con recursos asociados.
 */
@Injectable()
export class CreateStoryUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: StoriesRepository,
    private readonly readingLevelsRepository: ReadingLevelsRepository,
    private readonly genresRepository: GenresRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(dto: CreateStoryDto, actorUserId: string, context: RequestContext) {
    const readingLevel = await this.readingLevelsRepository.findById(dto.readingLevelId);

    if (!readingLevel) {
      throw AppException.businessRule(ReadingLevelMessages.NotFound, [
        { field: 'readingLevelId', message: ReadingLevelMessages.NotFound },
      ]);
    }

    const genreIds = await this.validateGenres(dto.genreIds);
    const slug = await this.buildUniqueSlug(dto.title);

    const created = await this.prisma.runInTransaction((tx) =>
      this.repository.create(
        {
          title: dto.title,
          slug,
          readingLevelId: dto.readingLevelId,
          author: dto.author ?? null,
          summary: dto.summary ?? null,
          content: dto.content,
          estimatedReadingMinutes: dto.estimatedReadingMinutes ?? null,
          sortOrder: dto.sortOrder ?? 0,
          createdByUserId: actorUserId,
          updatedByUserId: actorUserId,
        },
        genreIds,
        tx,
      ),
    );

    await this.auditService.record({
      actorUserId,
      action: AuditAction.StoryCreated,
      entityType: AuditEntityType.Story,
      entityId: created.id,
      summary: `Se creó la historia "${created.title}" en borrador.`,
      context,
    });

    return toStoryDetail(created);
  }

  /** Verifica que todos los géneros enviados existan y estén vigentes. */
  private async validateGenres(genreIds: string[] | undefined): Promise<string[]> {
    if (!genreIds || genreIds.length === 0) return [];

    const found = await this.prisma.runInTransaction((tx) =>
      this.genresRepository.findManyActiveByIds(genreIds, tx),
    );

    if (found.length !== new Set(genreIds).size) {
      throw AppException.businessRule(GenreMessages.UnknownGenre, [
        { field: 'genreIds', message: GenreMessages.UnknownGenre },
      ]);
    }

    return genreIds;
  }

  /** Genera un slug único agregando un sufijo incremental si ya existe. */
  private async buildUniqueSlug(title: string): Promise<string> {
    const base = buildSlug(title) || 'historia';
    let candidate = base;
    let suffix = 1;

    while (await this.repository.findBySlug(candidate)) {
      suffix += 1;
      candidate = buildSlugWithSuffix(base, suffix);
    }

    return candidate;
  }
}
