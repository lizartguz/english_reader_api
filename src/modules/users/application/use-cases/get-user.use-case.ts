import { Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { UserMessages } from '@/common/constants/messages.constants';
import { toUserAdminResponse } from '@/modules/users/domain/user-selects';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';

/** Obtiene un usuario por identificador para el panel administrativo. */
@Injectable()
export class GetUserUseCase {
  constructor(private readonly repository: UsersRepository) {}

  async execute(id: string) {
    const user = await this.repository.findByIdWithAccess(id);

    if (!user) throw AppException.notFound(UserMessages.NotFound);

    return toUserAdminResponse(user);
  }
}
