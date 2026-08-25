import { Injectable } from '@nestjs/common';
import { StoryMessages } from '@/common/constants/messages.constants';
import { AppException } from '@/common/exceptions/app.exception';
import { buildPaginationMeta, normalizePagination } from '@/common/utils/pagination.util';
import { toAppStoryDetail, toAppStoryListItem } from '@/modules/stories/domain/story-mapper';
import { StoriesRepository } from '../../infrastructure/persistence/stories.repository';
import type { AppStoryQueryDto } from '../dto';

/** Lista historias publicadas disponibles para lectura móvil. */
@Injectable()
export class ListAppStoriesUseCase {
  constructor(private readonly repository: StoriesRepository) {}

  async execute(query: AppStoryQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query.page, query.limit);
    const { items, total } = await this.repository.listPublished(
      {
        search: query.search,
        readingLevelId: query.readingLevelId,
        genreId: query.genreId,
      },
      { skip, take },
      { field: query.sort, order: query.order },
    );

    return { items: items.map(toAppStoryListItem), meta: buildPaginationMeta(total, page, limit) };
  }
}

/** Obtiene una historia publicada para la pantalla de lectura móvil. */
@Injectable()
export class GetAppStoryUseCase {
  constructor(private readonly repository: StoriesRepository) {}

  async execute(id: string) {
    const story = await this.repository.findPublishedById(id);

    if (!story) throw AppException.notFound(StoryMessages.NotAvailable);

    return toAppStoryDetail(story);
  }
}
