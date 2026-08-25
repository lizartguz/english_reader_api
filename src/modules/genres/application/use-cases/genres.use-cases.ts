import { Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { GenreMessages } from '@/common/constants/messages.constants';
import { AuditAction, AuditEntityType } from '@/common/constants/audit-actions.constants';
import { buildPaginationMeta, normalizePagination } from '@/common/utils/pagination.util';
import type { RequestContext } from '@/common/utils/request-context.util';
import { AuditService } from '@/modules/audit/application/audit.service';
import { GenresRepository } from '../../infrastructure/persistence/genres.repository';
import type { CreateGenreDto, UpdateGenreDto } from '../dto/genre.dto';
import type { GenreQueryDto } from '../dto/genre-query.dto';

/** Lista géneros literarios con paginación, búsqueda y filtro de estado. */
@Injectable()
export class ListGenresUseCase {
  constructor(private readonly repository: GenresRepository) {}

  async execute(query: GenreQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query.page, query.limit);

    const { items, total } = await this.repository.list(
      { search: query.search, isActive: query.isActive },
      { skip, take },
      { field: query.sort, order: query.order },
    );

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }
}

/** Obtiene un género literario por identificador. */
@Injectable()
export class GetGenreUseCase {
  constructor(private readonly repository: GenresRepository) {}

  async execute(id: string) {
    const genre = await this.repository.findById(id);

    if (!genre) throw AppException.notFound(GenreMessages.NotFound);

    return genre;
  }
}

/** Crea un género literario nuevo, validando que el código no esté en uso. */
@Injectable()
export class CreateGenreUseCase {
  constructor(
    private readonly repository: GenresRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(dto: CreateGenreDto, actorUserId: string, context: RequestContext) {
    const existing = await this.repository.findByCode(dto.code);

    if (existing) {
      throw AppException.conflict(GenreMessages.CodeAlreadyUsed, [
        { field: 'code', message: GenreMessages.CodeAlreadyUsed },
      ]);
    }

    const created = await this.repository.create({
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    });

    await this.auditService.record({
      actorUserId,
      action: AuditAction.GenreCreated,
      entityType: AuditEntityType.Genre,
      entityId: created.id,
      summary: `Se creó el género ${created.code}.`,
      context,
    });

    return created;
  }
}

/** Actualiza un género literario existente. */
@Injectable()
export class UpdateGenreUseCase {
  constructor(
    private readonly repository: GenresRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(id: string, dto: UpdateGenreDto, actorUserId: string, context: RequestContext) {
    const current = await this.repository.findById(id);

    if (!current) throw AppException.notFound(GenreMessages.NotFound);

    if (dto.code && dto.code !== current.code) {
      const existing = await this.repository.findByCode(dto.code, id);

      if (existing) {
        throw AppException.conflict(GenreMessages.CodeAlreadyUsed, [
          { field: 'code', message: GenreMessages.CodeAlreadyUsed },
        ]);
      }
    }

    const updated = await this.repository.update(id, {
      ...(dto.code !== undefined ? { code: dto.code } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });

    await this.auditService.record({
      actorUserId,
      action: AuditAction.GenreUpdated,
      entityType: AuditEntityType.Genre,
      entityId: updated.id,
      summary: `Se actualizó el género ${updated.code}.`,
      context,
    });

    return updated;
  }
}

/**
 * Elimina lógicamente un género literario.
 * Se rechaza si aún hay historias vigentes que lo tengan asignado.
 */
@Injectable()
export class DeleteGenreUseCase {
  constructor(
    private readonly repository: GenresRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(id: string, actorUserId: string, context: RequestContext): Promise<void> {
    const current = await this.repository.findById(id);

    if (!current) throw AppException.notFound(GenreMessages.NotFound);

    const storiesUsingGenre = await this.repository.countStoriesUsingGenre(id);

    if (storiesUsingGenre > 0) {
      throw AppException.conflict(GenreMessages.GenreInUse);
    }

    await this.repository.softDelete(id);

    await this.auditService.record({
      actorUserId,
      action: AuditAction.GenreDeleted,
      entityType: AuditEntityType.Genre,
      entityId: id,
      summary: `Se eliminó el género ${current.code}.`,
      context,
    });
  }
}
