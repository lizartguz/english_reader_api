import { Injectable } from '@nestjs/common';
import { buildPaginationMeta, normalizePagination } from '@/common/utils/pagination.util';
import { toAdminReadingProgressResponse } from '../../domain/reading-progress.mapper';
import { ReadingProgressRepository } from '../../infrastructure/persistence/reading-progress.repository';
import type { AdminReadingProgressQueryDto } from '../dto';

/** Lista avances de lectura de clientes para consulta administrativa. */
@Injectable()
export class ListAdminReadingProgressUseCase {
  constructor(private readonly repository: ReadingProgressRepository) {}

  async execute(query: AdminReadingProgressQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query.page, query.limit);
    const { items, total } = await this.repository.listAdmin(
      {
        search: query.search,
        userId: query.userId,
        storyId: query.storyId,
        completed: query.completed,
      },
      { skip, take },
      { field: query.sort, order: query.order },
    );

    return {
      items: items.map(toAdminReadingProgressResponse),
      meta: buildPaginationMeta(total, page, limit),
    };
  }
}
