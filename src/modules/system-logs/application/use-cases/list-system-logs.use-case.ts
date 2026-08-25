import { Injectable } from '@nestjs/common';
import { buildPaginationMeta, normalizePagination } from '@/common/utils/pagination.util';
import { SystemLogRepository } from '../../infrastructure/persistence/system-log.repository';
import type { SystemLogQueryDto } from '../dto/system-log-query.dto';

/** Lista los registros técnicos del sistema. Restringido a SUPER_ADMIN. */
@Injectable()
export class ListSystemLogsUseCase {
  constructor(private readonly repository: SystemLogRepository) {}

  async execute(query: SystemLogQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query.page, query.limit);

    const { items, total } = await this.repository.list(
      {
        level: query.level,
        source: query.source,
        errorCode: query.errorCode,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      },
      { skip, take },
      { field: query.sort, order: query.order },
    );

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }
}
