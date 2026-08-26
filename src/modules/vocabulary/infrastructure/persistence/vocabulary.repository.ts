import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { SavedWordStatus, StoryStatus } from '@/common/enums/domain.enums';
import { SortOrder } from '@/common/enums/sort-order.enum';
import { buildOrderBy } from '@/common/utils/pagination.util';
import {
  ADMIN_SAVED_WORD_INCLUDE,
  SAVED_WORD_INCLUDE,
  type AdminSavedWordWithDetails,
  type SavedWordWithDetails,
} from '../../domain/vocabulary.mapper';
import {
  VOCABULARY_SORT_FIELDS,
  type VocabularySortField,
} from '../../application/dto/vocabulary-query.dto';

/** Filtros soportados por el vocabulario personal. */
export interface VocabularyFilters {
  search?: string;
  status?: SavedWordStatus;
  userId?: string;
  storyId?: string;
}

/** Datos para guardar o reactivar una palabra del usuario. */
export interface SaveVocabularyInput {
  userId: string;
  wordEntryId: string;
  storyId?: string | null;
  notes?: string | null;
}

/** Acceso a datos del vocabulario personal del cliente. */
@Injectable()
export class VocabularyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    filters: VocabularyFilters,
    pagination: { skip: number; take: number },
    sort: { field?: string; order?: SortOrder },
  ) {
    const where = this.buildWhere(userId, filters);
    const orderBy = buildOrderBy<VocabularySortField>(
      sort.field,
      sort.order,
      VOCABULARY_SORT_FIELDS,
      'savedAt',
    );

    const [items, total] = await Promise.all([
      this.prisma.userSavedWord.findMany({
        where,
        include: SAVED_WORD_INCLUDE,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.userSavedWord.count({ where }),
    ]);

    return { items, total };
  }

  async listAdmin(
    filters: VocabularyFilters,
    pagination: { skip: number; take: number },
    sort: { field?: string; order?: SortOrder },
  ): Promise<{ items: AdminSavedWordWithDetails[]; total: number }> {
    const where = this.buildWhere(filters.userId, filters);
    const orderBy = buildOrderBy<VocabularySortField>(
      sort.field,
      sort.order,
      VOCABULARY_SORT_FIELDS,
      'savedAt',
    );

    const [items, total] = await Promise.all([
      this.prisma.userSavedWord.findMany({
        where,
        include: ADMIN_SAVED_WORD_INCLUDE,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.userSavedWord.count({ where }),
    ]);

    return { items, total };
  }

  findByIdForUser(id: string, userId: string) {
    return this.prisma.userSavedWord.findFirst({
      where: { id, userId, deletedAt: null },
      include: SAVED_WORD_INCLUDE,
    });
  }

  /**
   * Guarda la palabra de forma idempotente y reactiva registros eliminados.
   * La restricción única `(user_id, word_entry_id)` impide crear duplicados.
   */
  async save(
    input: SaveVocabularyInput,
  ): Promise<{ item: SavedWordWithDetails | null; alreadySaved: boolean }> {
    return this.prisma.runInTransaction(async (tx) => {
      const wordEntry = await tx.wordEntry.findFirst({
        where: { id: input.wordEntryId, deletedAt: null },
        select: { id: true },
      });

      if (!wordEntry) return { item: null, alreadySaved: false };

      if (input.storyId) {
        const story = await tx.story.findFirst({
          where: { id: input.storyId, deletedAt: null, status: StoryStatus.published },
          select: { id: true },
        });

        if (!story) return { item: null, alreadySaved: false };
      }

      const existing = await tx.userSavedWord.findUnique({
        where: { userId_wordEntryId: { userId: input.userId, wordEntryId: input.wordEntryId } },
        include: SAVED_WORD_INCLUDE,
      });

      if (existing?.deletedAt === null) return { item: existing, alreadySaved: true };

      if (existing) {
        const restored = await tx.userSavedWord.update({
          where: { id: existing.id },
          data: {
            deletedAt: null,
            status: SavedWordStatus.saved,
            storyId: input.storyId ?? existing.storyId,
            notes: input.notes ?? existing.notes,
            savedAt: new Date(),
            lastReviewedAt: null,
          },
          include: SAVED_WORD_INCLUDE,
        });

        return { item: restored, alreadySaved: false };
      }

      const created = await tx.userSavedWord.create({
        data: {
          userId: input.userId,
          wordEntryId: input.wordEntryId,
          storyId: input.storyId ?? null,
          notes: input.notes ?? null,
          status: SavedWordStatus.saved,
        },
        include: SAVED_WORD_INCLUDE,
      });

      return { item: created, alreadySaved: false };
    });
  }

  updateForUser(
    id: string,
    userId: string,
    data: { status?: SavedWordStatus; notes?: string | null },
  ) {
    return this.prisma.userSavedWord.update({
      where: { id, userId },
      data: {
        ...(data.status !== undefined ? { status: data.status, lastReviewedAt: new Date() } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
      include: SAVED_WORD_INCLUDE,
    });
  }

  /**
   * Elimina lógicamente respetando siempre la propiedad del registro, aunque
   * el caso de uso ya lo haya verificado antes con `findByIdForUser`: es una
   * segunda barrera a nivel de datos, no solo de aplicación.
   */
  softDeleteForUser(id: string, userId: string) {
    return this.prisma.userSavedWord.update({
      where: { id, userId },
      data: { deletedAt: new Date() },
      select: { id: true, userId: true },
    });
  }

  private buildWhere(userId: string | undefined, filters: VocabularyFilters) {
    return {
      deletedAt: null,
      ...(userId ? { userId } : {}),
      ...(filters.storyId ? { storyId: filters.storyId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search
        ? {
            OR: [
              { wordEntry: { word: { contains: filters.search } } },
              { wordEntry: { normalizedWord: { contains: filters.search } } },
              {
                wordEntry: {
                  translations: { some: { translation: { contains: filters.search } } },
                },
              },
            ],
          }
        : {}),
    };
  }
}
