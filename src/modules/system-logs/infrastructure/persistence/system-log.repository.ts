import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { SortOrder } from '@/common/enums/sort-order.enum';
import { SystemLogLevel } from '@/common/enums/domain.enums';
import { buildOrderBy } from '@/common/utils/pagination.util';
import { subtractMonths } from '@/common/utils/duration.util';
import {
  SYSTEM_LOG_SORT_FIELDS,
  type SystemLogSortField,
} from '@/modules/system-logs/application/dto/system-log-query.dto';

/** Filtros soportados por la consulta administrativa de registros técnicos. */
export interface SystemLogFilters {
  level?: SystemLogLevel;
  source?: string;
  errorCode?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/** Acceso de solo lectura a los registros técnicos, más su limpieza por retención. */
@Injectable()
export class SystemLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    filters: SystemLogFilters,
    pagination: { skip: number; take: number },
    sort: { field?: string; order?: SortOrder },
  ) {
    const where = this.buildWhere(filters);
    const orderBy = buildOrderBy<SystemLogSortField>(
      sort.field,
      sort.order,
      SYSTEM_LOG_SORT_FIELDS,
      'createdAt',
    );

    const [items, total] = await Promise.all([
      this.prisma.systemLog.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.systemLog.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Elimina los registros anteriores al límite de retención configurado.
   * Devuelve la cantidad de filas eliminadas, para dejar rastro en el propio log de aplicación.
   */
  async deleteOlderThanMonths(months: number): Promise<number> {
    const cutoff = subtractMonths(new Date(), months);
    const result = await this.prisma.systemLog.deleteMany({ where: { createdAt: { lt: cutoff } } });

    return result.count;
  }

  private buildWhere(filters: SystemLogFilters) {
    return {
      ...(filters.level ? { level: filters.level } : {}),
      ...(filters.source ? { source: filters.source } : {}),
      ...(filters.errorCode ? { errorCode: filters.errorCode } : {}),
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
