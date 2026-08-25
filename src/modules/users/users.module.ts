import { Module } from '@nestjs/common';
import { UsersRepository } from './infrastructure/persistence/users.repository';
import { UsersController } from './presentation/http/users.controller';
import { UserAccessPolicyService } from './application/services/user-access-policy.service';
import {
  AssignUserRolesUseCase,
  ChangeUserStatusUseCase,
  CreateUserUseCase,
  DeleteUserUseCase,
  GetUserUseCase,
  ListUsersUseCase,
  UpdateUserUseCase,
} from './application/use-cases';

/**
 * Módulo de usuarios.
 *
 * Expone el acceso a datos que consume autenticación y el CRUD administrativo
 * consumido por React Admin.
 */
@Module({
  controllers: [UsersController],
  providers: [
    UsersRepository,
    UserAccessPolicyService,
    ListUsersUseCase,
    GetUserUseCase,
    CreateUserUseCase,
    UpdateUserUseCase,
    ChangeUserStatusUseCase,
    AssignUserRolesUseCase,
    DeleteUserUseCase,
  ],
  exports: [UsersRepository],
})
export class UsersModule {}
