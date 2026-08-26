import { Injectable } from '@nestjs/common';
import { buildPaginationMeta, normalizePagination } from '@/common/utils/pagination.util';
import { toUserAdminResponse } from '@/modules/users/domain/user-selects';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import type { UserQueryDto } from '../dto/user-query.dto';

/** Lista usuarios con paginación, búsqueda y filtros administrativos. */
@Injectable()
export class ListUsersUseCase {
  constructor(private readonly repository: UsersRepository) {}

  async execute(query: UserQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query.page, query.limit);

    const { items, total } = await this.repository.list(
      { search: query.search, status: query.status, roleCodes: query.roleCode },
      { skip, take },
      { field: query.sort, order: query.order },
    );

    return { items: items.map(toUserAdminResponse), meta: buildPaginationMeta(total, page, limit) };
  }
}
