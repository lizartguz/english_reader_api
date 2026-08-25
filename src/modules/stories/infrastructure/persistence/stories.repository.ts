import { Injectable } from '@nestjs/common';
import { PrismaService, PrismaTransaction } from '@/database/prisma.service';
import { StoryStatus } from '@/common/enums/domain.enums';
import { SortOrder } from '@/common/enums/sort-order.enum';
import { buildOrderBy } from '@/common/utils/pagination.util';
import {
  APP_STORY_DETAIL_SELECT,
  APP_STORY_LIST_SELECT,
  STORY_DETAIL_SELECT,
  STORY_LIST_SELECT,
} from '@/modules/stories/domain/story-mapper';
import {
  STORY_SORT_FIELDS,
  type StorySortField,
} from '@/modules/stories/application/dto/story-query.dto';

/** Filtros soportados por el listado administrativo de historias. */
export interface StoryFilters {
  search?: string;
  status?: StoryStatus;
  readingLevelId?: string;
  genreId?: string;
  publishedFrom?: Date;
  publishedTo?: Date;
}

/** Acceso a datos de historias. */
@Injectable()
export class StoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista historias paginadas, sin el contenido completo. */
  async list(
    filters: StoryFilters,
    pagination: { skip: number; take: number },
    sort: { field?: string; order?: SortOrder },
  ) {
    const where = this.buildWhere(filters);
    const orderBy = buildOrderBy<StorySortField>(
      sort.field,
      sort.order,
      STORY_SORT_FIELDS,
      'createdAt',
    );

    const [items, total] = await Promise.all([
      this.prisma.story.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
        select: STORY_LIST_SELECT,
      }),
      this.prisma.story.count({ where }),
    ]);

    return { items, total };
  }

  /** Busca una historia vigente por identificador, con su contenido completo. */
  findById(id: string, tx?: PrismaTransaction) {
    return (tx ?? this.prisma).story.findFirst({
      where: { id, deletedAt: null },
      select: STORY_DETAIL_SELECT,
    });
  }

  /** Lista solo historias publicadas para la app Flutter. */
  async listPublished(
    filters: Pick<StoryFilters, 'search' | 'readingLevelId' | 'genreId'>,
    pagination: { skip: number; take: number },
    sort: { field?: string; order?: SortOrder },
  ) {
    const where = this.buildWhere({ ...filters, status: StoryStatus.published });
    const orderBy = buildOrderBy<StorySortField>(
      sort.field,
      sort.order,
      STORY_SORT_FIELDS,
      'publishedAt',
    );

    const [items, total] = await Promise.all([
      this.prisma.story.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
        select: APP_STORY_LIST_SELECT,
      }),
      this.prisma.story.count({ where }),
    ]);

    return { items, total };
  }

  /** Busca una historia publicada para lectura móvil. */
  findPublishedById(id: string) {
    return this.prisma.story.findFirst({
      where: { id, deletedAt: null, status: StoryStatus.published },
      select: APP_STORY_DETAIL_SELECT,
    });
  }

  /** Busca una historia vigente por identificador, solo con los campos de estado. */
  findStatusById(id: string, tx?: PrismaTransaction) {
    return (tx ?? this.prisma).story.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, status: true, readingLevelId: true, publishedAt: true, title: true },
    });
  }

  findBySlug(slug: string, excludeId?: string) {
    return this.prisma.story.findFirst({
      where: { slug, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
  }

  /** Crea la historia y asigna sus géneros dentro de la misma transacción. */
  async create(
    data: {
      title: string;
      slug: string;
      readingLevelId: string;
      author?: string | null;
      summary?: string | null;
      content: string;
      estimatedReadingMinutes?: number | null;
      sortOrder?: number;
      createdByUserId: string;
      updatedByUserId: string;
    },
    genreIds: string[],
    tx: PrismaTransaction,
  ) {
    const created = await tx.story.create({
      data: {
        title: data.title,
        slug: data.slug,
        readingLevelId: data.readingLevelId,
        author: data.author ?? null,
        summary: data.summary ?? null,
        content: data.content,
        estimatedReadingMinutes: data.estimatedReadingMinutes ?? null,
        sortOrder: data.sortOrder ?? 0,
        createdByUserId: data.createdByUserId,
        updatedByUserId: data.updatedByUserId,
        status: StoryStatus.draft,
        genres: { create: genreIds.map((genreId) => ({ genreId })) },
      },
      select: STORY_DETAIL_SELECT,
    });

    return created;
  }

  /**
   * Actualiza los campos de la historia y, si se recibió `genreIds`, reemplaza
   * por completo la lista de géneros asociados. Todo ocurre en la transacción
   * recibida para que ambos cambios se confirmen o se reviertan juntos.
   */
  async update(
    id: string,
    data: Partial<{
      title: string;
      slug: string;
      readingLevelId: string;
      author: string | null;
      summary: string | null;
      content: string;
      estimatedReadingMinutes: number | null;
      sortOrder: number;
      updatedByUserId: string;
    }>,
    genreIds: string[] | undefined,
    tx: PrismaTransaction,
  ) {
    await tx.story.update({ where: { id }, data });

    if (genreIds !== undefined) {
      await tx.storyGenre.deleteMany({ where: { storyId: id } });

      if (genreIds.length > 0) {
        await tx.storyGenre.createMany({
          data: genreIds.map((genreId) => ({ storyId: id, genreId })),
          skipDuplicates: true,
        });
      }
    }

    return tx.story.findFirstOrThrow({ where: { id }, select: STORY_DETAIL_SELECT });
  }

  /** Cambia el estado de publicación de una historia. */
  changeStatus(
    id: string,
    status: StoryStatus,
    publishedAt: Date | null | undefined,
    updatedByUserId: string,
    tx?: PrismaTransaction,
  ) {
    return (tx ?? this.prisma).story.update({
      where: { id },
      data: {
        status,
        updatedByUserId,
        ...(publishedAt !== undefined ? { publishedAt } : {}),
      },
      select: STORY_DETAIL_SELECT,
    });
  }

  /** Elimina lógicamente la historia. */
  softDelete(id: string) {
    return this.prisma.story.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private buildWhere(filters: StoryFilters) {
    return {
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.readingLevelId ? { readingLevelId: filters.readingLevelId } : {}),
      ...(filters.genreId ? { genres: { some: { genreId: filters.genreId } } } : {}),
      ...(filters.publishedFrom || filters.publishedTo
        ? {
            publishedAt: {
              ...(filters.publishedFrom ? { gte: filters.publishedFrom } : {}),
              ...(filters.publishedTo ? { lte: filters.publishedTo } : {}),
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search } },
              { author: { contains: filters.search } },
              { summary: { contains: filters.search } },
            ],
          }
        : {}),
    };
  }
}
