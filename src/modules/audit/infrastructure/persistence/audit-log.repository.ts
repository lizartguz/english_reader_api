import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { SortOrder } from '@/common/enums/sort-order.enum';
import { buildOrderBy } from '@/common/utils/pagination.util';
import {
  AUDIT_LOG_SORT_FIELDS,
  type AuditLogSortField,
} from '@/modules/audit/application/dto/audit-log-query.dto';

/** Filtros soportados por la consulta administrativa de auditoría. */
export interface AuditLogFilters {
  actorUserId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

const AUDIT_LOG_SELECT = {
  id: true,
  action: true,
  entityType: true,
  entityId: true,
  summary: true,
  metadata: true,
  ipAddress: true,
  createdAt: true,
  actorUser: { select: { id: true, email: true, firstName: true, lastName: true } },
} as const;

/** Acceso de solo lectura a la auditoría funcional. */
@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    filters: AuditLogFilters,
    pagination: { skip: number; take: number },
    sort: { field?: string; order?: SortOrder },
  ) {
    const where = this.buildWhere(filters);
    const orderBy = buildOrderBy<AuditLogSortField>(
      sort.field,
      sort.order,
      AUDIT_LOG_SORT_FIELDS,
      'createdAt',
    );

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
        select: AUDIT_LOG_SELECT,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  }

  private buildWhere(filters: AuditLogFilters) {
    return {
      ...(filters.actorUserId ? { actorUserId: filters.actorUserId } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    };
  }
}
