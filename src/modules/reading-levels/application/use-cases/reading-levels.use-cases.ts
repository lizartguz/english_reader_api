import { Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ReadingLevelMessages } from '@/common/constants/messages.constants';
import { AuditAction, AuditEntityType } from '@/common/constants/audit-actions.constants';
import { buildPaginationMeta, normalizePagination } from '@/common/utils/pagination.util';
import type { RequestContext } from '@/common/utils/request-context.util';
import { AuditService } from '@/modules/audit/application/audit.service';
import { ReadingLevelsRepository } from '../../infrastructure/persistence/reading-levels.repository';
import type { CreateReadingLevelDto, UpdateReadingLevelDto } from '../dto/reading-level.dto';
import type { ReadingLevelQueryDto } from '../dto/reading-level-query.dto';

/** Lista niveles de lectura con paginación, búsqueda y filtro de estado. */
@Injectable()
export class ListReadingLevelsUseCase {
  constructor(private readonly repository: ReadingLevelsRepository) {}

  async execute(query: ReadingLevelQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query.page, query.limit);

    const { items, total } = await this.repository.list(
      { search: query.search, isActive: query.isActive },
      { skip, take },
      { field: query.sort, order: query.order },
    );

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }
}

/** Obtiene un nivel de lectura por identificador. */
@Injectable()
export class GetReadingLevelUseCase {
  constructor(private readonly repository: ReadingLevelsRepository) {}

  async execute(id: string) {
    const level = await this.repository.findById(id);

    if (!level) throw AppException.notFound(ReadingLevelMessages.NotFound);

    return level;
  }
}

/** Crea un nivel de lectura nuevo, validando que el código no esté en uso. */
@Injectable()
export class CreateReadingLevelUseCase {
  constructor(
    private readonly repository: ReadingLevelsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(dto: CreateReadingLevelDto, actorUserId: string, context: RequestContext) {
    const existing = await this.repository.findByCode(dto.code);

    if (existing) {
      throw AppException.conflict(ReadingLevelMessages.CodeAlreadyUsed, [
        { field: 'code', message: ReadingLevelMessages.CodeAlreadyUsed },
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
      action: AuditAction.ReadingLevelCreated,
      entityType: AuditEntityType.ReadingLevel,
      entityId: created.id,
      summary: `Se creó el nivel de lectura ${created.code}.`,
      context,
    });

    return created;
  }
}

/** Actualiza un nivel de lectura existente. */
@Injectable()
export class UpdateReadingLevelUseCase {
  constructor(
    private readonly repository: ReadingLevelsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    id: string,
    dto: UpdateReadingLevelDto,
    actorUserId: string,
    context: RequestContext,
  ) {
    const current = await this.repository.findById(id);

    if (!current) throw AppException.notFound(ReadingLevelMessages.NotFound);

    if (dto.code && dto.code !== current.code) {
      const existing = await this.repository.findByCode(dto.code, id);

      if (existing) {
        throw AppException.conflict(ReadingLevelMessages.CodeAlreadyUsed, [
          { field: 'code', message: ReadingLevelMessages.CodeAlreadyUsed },
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
      action: AuditAction.ReadingLevelUpdated,
      entityType: AuditEntityType.ReadingLevel,
      entityId: updated.id,
      summary: `Se actualizó el nivel de lectura ${updated.code}.`,
      context,
    });

    return updated;
  }
}

/**
 * Elimina lógicamente un nivel de lectura.
 *
 * Se rechaza si aún existen historias vigentes asociadas, según la regla de
 * `04-logica-negocio.md`: un nivel en uso no puede desaparecer del sistema.
 */
@Injectable()
export class DeleteReadingLevelUseCase {
  constructor(
    private readonly repository: ReadingLevelsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(id: string, actorUserId: string, context: RequestContext): Promise<void> {
    const current = await this.repository.findById(id);

    if (!current) throw AppException.notFound(ReadingLevelMessages.NotFound);

    const storiesUsingLevel = await this.repository.countStoriesUsingLevel(id);

    if (storiesUsingLevel > 0) {
      throw AppException.conflict(ReadingLevelMessages.LevelInUse);
    }

    await this.repository.softDelete(id);

    await this.auditService.record({
      actorUserId,
      action: AuditAction.ReadingLevelDeleted,
      entityType: AuditEntityType.ReadingLevel,
      entityId: id,
      summary: `Se eliminó el nivel de lectura ${current.code}.`,
      context,
    });
  }
}
