import { Injectable } from '@nestjs/common';
import { buildPaginationMeta, normalizePagination } from '@/common/utils/pagination.util';
import { toStoryListItem } from '@/modules/stories/domain/story-mapper';
import { StoriesRepository } from '../../infrastructure/persistence/stories.repository';
import type { StoryQueryDto } from '../dto/story-query.dto';

/** Lista historias con paginación, búsqueda y filtros administrativos. */
@Injectable()
export class ListStoriesUseCase {
  constructor(private readonly repository: StoriesRepository) {}

  async execute(query: StoryQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query.page, query.limit);

    const { items, total } = await this.repository.list(
      {
        search: query.search,
        status: query.status,
        readingLevelId: query.readingLevelId,
        genreId: query.genreId,
        publishedFrom: query.publishedFrom ? new Date(query.publishedFrom) : undefined,
        publishedTo: query.publishedTo ? new Date(query.publishedTo) : undefined,
      },
      { skip, take },
      { field: query.sort, order: query.order },
    );

    return {
      items: items.map(toStoryListItem),
      meta: buildPaginationMeta(total, page, limit),
    };
  }
}
