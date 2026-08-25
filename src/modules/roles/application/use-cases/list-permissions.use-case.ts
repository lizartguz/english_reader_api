import { Injectable } from '@nestjs/common';
import { PermissionsRepository } from '../../infrastructure/persistence/permissions.repository';

/** Lista el catálogo completo de permisos, usado por el editor de roles. */
@Injectable()
export class ListPermissionsUseCase {
  constructor(private readonly repository: PermissionsRepository) {}

  execute() {
    return this.repository.findAll();
  }
}
