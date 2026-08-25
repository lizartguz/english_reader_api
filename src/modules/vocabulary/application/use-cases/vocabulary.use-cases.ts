import { Injectable } from '@nestjs/common';
import { VocabularyMessages } from '@/common/constants/messages.constants';
import { AppException } from '@/common/exceptions/app.exception';
import { buildPaginationMeta, normalizePagination } from '@/common/utils/pagination.util';
import { VocabularyRepository } from '../../infrastructure/persistence/vocabulary.repository';
import { toVocabularyResponse } from '../../domain/vocabulary.mapper';
import type { SaveVocabularyDto, UpdateVocabularyDto, VocabularyQueryDto } from '../dto';

/** Lista el vocabulario del usuario cliente autenticado. */
@Injectable()
export class ListVocabularyUseCase {
  constructor(private readonly repository: VocabularyRepository) {}

  async execute(userId: string, query: VocabularyQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query.page, query.limit);
    const { items, total } = await this.repository.list(
      userId,
      { search: query.search, status: query.status },
      { skip, take },
      { field: query.sort, order: query.order },
    );

    return {
      items: items.map(toVocabularyResponse),
      meta: buildPaginationMeta(total, page, limit),
    };
  }
}

/** Guarda una palabra en el vocabulario personal sin duplicarla. */
@Injectable()
export class SaveVocabularyUseCase {
  constructor(private readonly repository: VocabularyRepository) {}

  async execute(userId: string, dto: SaveVocabularyDto) {
    const { item, alreadySaved } = await this.repository.save({
      userId,
      wordEntryId: dto.wordEntryId,
      storyId: dto.storyId ?? null,
      notes: dto.notes ?? null,
    });

    if (!item) throw AppException.notFound(VocabularyMessages.NotFound);

    return { item: toVocabularyResponse(item), alreadySaved };
  }
}

/** Actualiza el estado o las notas de una palabra guardada. */
@Injectable()
export class UpdateVocabularyUseCase {
  constructor(private readonly repository: VocabularyRepository) {}

  async execute(id: string, userId: string, dto: UpdateVocabularyDto) {
    const current = await this.repository.findByIdForUser(id, userId);

    if (!current) throw AppException.notFound(VocabularyMessages.NotFound);

    const updated = await this.repository.updateForUser(id, userId, {
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
    });

    return toVocabularyResponse(updated);
  }
}

/** Elimina lógicamente una palabra del vocabulario del usuario. */
@Injectable()
export class RemoveVocabularyUseCase {
  constructor(private readonly repository: VocabularyRepository) {}

  async execute(id: string, userId: string): Promise<void> {
    const current = await this.repository.findByIdForUser(id, userId);

    if (!current) throw AppException.notFound(VocabularyMessages.NotFound);

    await this.repository.softDeleteForUser(id, userId);
  }
}
