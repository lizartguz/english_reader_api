import { Injectable } from '@nestjs/common';
import { buildPaginationMeta, normalizePagination } from '@/common/utils/pagination.util';
import { toAdminVocabularyResponse } from '../../domain/vocabulary.mapper';
import { VocabularyRepository } from '../../infrastructure/persistence/vocabulary.repository';
import type { AdminVocabularyQueryDto } from '../dto';

/** Lista vocabulario de clientes para consulta administrativa. */
@Injectable()
export class ListAdminVocabularyUseCase {
  constructor(private readonly repository: VocabularyRepository) {}

  async execute(query: AdminVocabularyQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query.page, query.limit);
    const { items, total } = await this.repository.listAdmin(
      {
        search: query.search,
        status: query.status,
        userId: query.userId,
        storyId: query.storyId,
      },
      { skip, take },
      { field: query.sort, order: query.order },
    );

    return {
      items: items.map(toAdminVocabularyResponse),
      meta: buildPaginationMeta(total, page, limit),
    };
  }
}
