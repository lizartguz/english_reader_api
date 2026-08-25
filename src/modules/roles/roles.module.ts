import { Module } from '@nestjs/common';
import { RolesRepository } from './infrastructure/persistence/roles.repository';
import { PermissionsRepository } from './infrastructure/persistence/permissions.repository';
import { RolesController } from './presentation/http/roles.controller';
import { PermissionsController } from './presentation/http/permissions.controller';
import {
  CreateRoleUseCase,
  DeleteRoleUseCase,
  GetRoleUseCase,
  ListPermissionsUseCase,
  ListRolesUseCase,
  UpdateRolePermissionsUseCase,
  UpdateRoleUseCase,
} from './application/use-cases';

/** CRUD administrativo de roles y catálogo de permisos. */
@Module({
  controllers: [RolesController, PermissionsController],
  providers: [
    RolesRepository,
    PermissionsRepository,
    ListRolesUseCase,
    GetRoleUseCase,
    CreateRoleUseCase,
    UpdateRoleUseCase,
    UpdateRolePermissionsUseCase,
    DeleteRoleUseCase,
    ListPermissionsUseCase,
  ],
  exports: [RolesRepository, PermissionsRepository],
})
export class RolesModule {}
