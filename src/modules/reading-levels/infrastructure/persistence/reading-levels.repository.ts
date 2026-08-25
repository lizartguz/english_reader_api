import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { SortOrder } from '@/common/enums/sort-order.enum';
import { buildOrderBy } from '@/common/utils/pagination.util';
import {
  READING_LEVEL_SORT_FIELDS,
  type ReadingLevelSortField,
} from '@/modules/reading-levels/application/dto/reading-level-query.dto';

/** Filtros soportados por el listado administrativo de niveles de lectura. */
export interface ReadingLevelFilters {
  search?: string;
  isActive?: boolean;
}

/** Acceso a datos de niveles de lectura. */
@Injectable()
export class ReadingLevelsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista niveles paginados, excluyendo los eliminados lógicamente. */
  async list(
    filters: ReadingLevelFilters,
    pagination: { skip: number; take: number },
    sort: { field?: string; order?: SortOrder },
  ) {
    const where = this.buildWhere(filters);
    const orderBy = buildOrderBy<ReadingLevelSortField>(
      sort.field,
      sort.order,
      READING_LEVEL_SORT_FIELDS,
      'sortOrder',
    );

    const [items, total] = await Promise.all([
      this.prisma.readingLevel.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.readingLevel.count({ where }),
    ]);

    return { items, total };
  }

  /** Busca un nivel vigente por identificador. */
  findById(id: string) {
    return this.prisma.readingLevel.findFirst({ where: { id, deletedAt: null } });
  }

  /** Busca un nivel vigente por código, útil para validar unicidad. */
  findByCode(code: string, excludeId?: string) {
    return this.prisma.readingLevel.findFirst({
      where: { code, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
  }

  create(data: {
    code: string;
    name: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    return this.prisma.readingLevel.create({ data });
  }

  update(
    id: string,
    data: Partial<{
      code: string;
      name: string;
      description: string | null;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) {
    return this.prisma.readingLevel.update({ where: { id }, data });
  }

  /** Elimina lógicamente el nivel. */
  softDelete(id: string) {
    return this.prisma.readingLevel.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /** Cuenta las historias vigentes que aún dependen de este nivel. */
  async countStoriesUsingLevel(id: string): Promise<number> {
    return this.prisma.story.count({ where: { readingLevelId: id, deletedAt: null } });
  }

  /** Construye la cláusula `where` a partir de los filtros recibidos. */
  private buildWhere(filters: ReadingLevelFilters) {
    return {
      deletedAt: null,
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.search
        ? {
            OR: [{ name: { contains: filters.search } }, { code: { contains: filters.search } }],
          }
        : {}),
    };
  }
}
