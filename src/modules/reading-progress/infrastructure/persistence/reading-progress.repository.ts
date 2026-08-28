import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { StoryStatus } from '@/common/enums/domain.enums';
import { SortOrder } from '@/common/enums/sort-order.enum';
import { buildOrderBy } from '@/common/utils/pagination.util';
import {
  ADMIN_READING_PROGRESS_INCLUDE,
  type AdminReadingProgressRow,
} from '../../domain/reading-progress.mapper';

const READING_PROGRESS_SORT_FIELDS = ['lastReadAt', 'updatedAt', 'progressPercent'] as const;
type ReadingProgressSortField = (typeof READING_PROGRESS_SORT_FIELDS)[number];

/** Datos normalizados para crear o actualizar progreso de lectura. */
export interface SaveReadingProgressInput {
  userId: string;
  storyId: string;
  progressPercent?: number;
  lastPosition?: string | null;
  completedAt?: Date | null;
  lastReadAt: Date;
}

/** Filtros de consulta administrativa de progreso. */
export interface ReadingProgressAdminFilters {
  search?: string;
  userId?: string;
  storyId?: string;
  completed?: boolean;
}

/** Acceso a datos de avance de lectura del usuario cliente. */
@Injectable()
export class ReadingProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserAndStory(userId: string, storyId: string) {
    return this.prisma.readingProgress.findUnique({
      where: { userId_storyId: { userId, storyId } },
    });
  }

  /** Lista el avance del cliente solo para historias publicadas. */
  listByUser(userId: string) {
    return this.prisma.readingProgress.findMany({
      where: { userId, story: { status: StoryStatus.published } },
      orderBy: { lastReadAt: SortOrder.Desc },
    });
  }

  async listAdmin(
    filters: ReadingProgressAdminFilters,
    pagination: { skip: number; take: number },
    sort: { field?: string; order?: SortOrder },
  ): Promise<{ items: AdminReadingProgressRow[]; total: number }> {
    const where = {
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.storyId ? { storyId: filters.storyId } : {}),
      ...(filters.completed === true ? { completedAt: { not: null } } : {}),
      ...(filters.completed === false ? { completedAt: null } : {}),
      ...(filters.search
        ? {
            OR: [
              { user: { email: { contains: filters.search } } },
              { user: { firstName: { contains: filters.search } } },
              { user: { lastName: { contains: filters.search } } },
              { story: { title: { contains: filters.search } } },
            ],
          }
        : {}),
    };
    const orderBy = buildOrderBy<ReadingProgressSortField>(
      sort.field,
      sort.order,
      READING_PROGRESS_SORT_FIELDS,
      'lastReadAt',
    );

    const [items, total] = await Promise.all([
      this.prisma.readingProgress.findMany({
        where,
        include: ADMIN_READING_PROGRESS_INCLUDE,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.readingProgress.count({ where }),
    ]);

    return { items, total };
  }

  upsert(input: SaveReadingProgressInput) {
    const progressPercent = input.progressPercent ?? 0;

    return this.prisma.readingProgress.upsert({
      where: { userId_storyId: { userId: input.userId, storyId: input.storyId } },
      create: {
        userId: input.userId,
        storyId: input.storyId,
        progressPercent,
        lastPosition: input.lastPosition ?? null,
        completedAt: input.completedAt ?? null,
        lastReadAt: input.lastReadAt,
      },
      update: {
        ...(input.progressPercent !== undefined ? { progressPercent } : {}),
        ...(input.lastPosition !== undefined ? { lastPosition: input.lastPosition } : {}),
        ...(input.completedAt !== undefined ? { completedAt: input.completedAt } : {}),
        lastReadAt: input.lastReadAt,
      },
    });
  }
}
