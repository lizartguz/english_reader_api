import { Injectable } from '@nestjs/common';
import { PrismaService, PrismaTransaction } from '@/database/prisma.service';
import { SortOrder } from '@/common/enums/sort-order.enum';
import { buildOrderBy } from '@/common/utils/pagination.util';
import {
  GENRE_SORT_FIELDS,
  type GenreSortField,
} from '@/modules/genres/application/dto/genre-query.dto';

/** Filtros soportados por el listado administrativo de géneros. */
export interface GenreFilters {
  search?: string;
  isActive?: boolean;
}

/** Acceso a datos de géneros literarios. */
@Injectable()
export class GenresRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista géneros paginados, excluyendo los eliminados lógicamente. */
  async list(
    filters: GenreFilters,
    pagination: { skip: number; take: number },
    sort: { field?: string; order?: SortOrder },
  ) {
    const where = this.buildWhere(filters);
    const orderBy = buildOrderBy<GenreSortField>(
      sort.field,
      sort.order,
      GENRE_SORT_FIELDS,
      'sortOrder',
    );

    const [items, total] = await Promise.all([
      this.prisma.genre.findMany({ where, orderBy, skip: pagination.skip, take: pagination.take }),
      this.prisma.genre.count({ where }),
    ]);

    return { items, total };
  }

  findById(id: string, tx?: PrismaTransaction) {
    return (tx ?? this.prisma).genre.findFirst({ where: { id, deletedAt: null } });
  }

  findByCode(code: string, excludeId?: string) {
    return this.prisma.genre.findFirst({
      where: { code, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
  }

  /**
   * Busca varios géneros activos y vigentes por identificador.
   * Se usa al asignar géneros a una historia, dentro de la misma transacción.
   */
  findManyActiveByIds(ids: string[], tx: PrismaTransaction) {
    return tx.genre.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true },
    });
  }

  create(data: {
    code: string;
    name: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    return this.prisma.genre.create({ data });
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
    return this.prisma.genre.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.genre.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /** Cuenta las historias vigentes que aún tienen este género asignado. */
  async countStoriesUsingGenre(id: string): Promise<number> {
    return this.prisma.storyGenre.count({
      where: { genreId: id, story: { deletedAt: null } },
    });
  }

  private buildWhere(filters: GenreFilters) {
    return {
      deletedAt: null,
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.search
        ? { OR: [{ name: { contains: filters.search } }, { code: { contains: filters.search } }] }
        : {}),
    };
  }
}
