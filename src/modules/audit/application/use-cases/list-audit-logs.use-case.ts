import { Injectable } from '@nestjs/common';
import { buildPaginationMeta, normalizePagination } from '@/common/utils/pagination.util';
import { AuditLogRepository } from '../../infrastructure/persistence/audit-log.repository';
import type { AuditLogQueryDto } from '../dto/audit-log-query.dto';
import type { AuditLogResponseDto } from '../dto/audit-log-response.dto';

/** Lista la auditoría administrativa con paginación y filtros. */
@Injectable()
export class ListAuditLogsUseCase {
  constructor(private readonly repository: AuditLogRepository) {}

  async execute(query: AuditLogQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query.page, query.limit);

    const { items, total } = await this.repository.list(
      {
        actorUserId: query.actorUserId,
        action: query.action,
        entityType: query.entityType,
        entityId: query.entityId,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      },
      { skip, take },
      { field: query.sort, order: query.order },
    );

    const mapped: AuditLogResponseDto[] = items.map((item) => ({
      id: item.id,
      actor: item.actorUser
        ? {
            id: item.actorUser.id,
            email: item.actorUser.email,
            fullName: `${item.actorUser.firstName} ${item.actorUser.lastName}`.trim(),
          }
        : null,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      summary: item.summary,
      metadata: item.metadata,
      ipAddress: item.ipAddress,
      createdAt: item.createdAt,
    }));

    return { items: mapped, meta: buildPaginationMeta(total, page, limit) };
  }
}
