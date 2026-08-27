import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import { RoleMessages } from '@/common/constants/messages.constants';
import { RoleCode } from '@/common/enums/role-code.enum';
import { AuditAction, AuditEntityType } from '@/common/constants/audit-actions.constants';
import { buildPaginationMeta, normalizePagination } from '@/common/utils/pagination.util';
import type { RequestContext } from '@/common/utils/request-context.util';
import { AuditService } from '@/modules/audit/application/audit.service';
import { toRoleResponse } from '@/modules/roles/domain/role-mapper';
import { RolesRepository } from '../../infrastructure/persistence/roles.repository';
import { PermissionsRepository } from '../../infrastructure/persistence/permissions.repository';
import type { CreateRoleDto, UpdateRoleDto, UpdateRolePermissionsDto } from '../dto/role.dto';
import type { RoleQueryDto } from '../dto/role-query.dto';

/** Lista roles con paginación y búsqueda. */
@Injectable()
export class ListRolesUseCase {
  constructor(private readonly repository: RolesRepository) {}

  async execute(query: RoleQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query.page, query.limit);

    const { items, total } = await this.repository.list(
      { search: query.search, isSystem: query.isSystem },
      { skip, take },
      { field: query.sort, order: query.order },
    );

    return { items: items.map(toRoleResponse), meta: buildPaginationMeta(total, page, limit) };
  }
}

/** Obtiene un rol por identificador, con sus permisos. */
@Injectable()
export class GetRoleUseCase {
  constructor(private readonly repository: RolesRepository) {}

  async execute(id: string) {
    const role = await this.repository.findById(id);

    if (!role) throw AppException.notFound(RoleMessages.NotFound);

    return toRoleResponse(role);
  }
}

/** Crea un rol personalizado, con sus permisos iniciales si se envían. */
@Injectable()
export class CreateRoleUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: RolesRepository,
    private readonly permissionsRepository: PermissionsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(dto: CreateRoleDto, actorUserId: string, context: RequestContext) {
    if (await this.repository.findByCode(dto.code)) {
      throw AppException.conflict(RoleMessages.CodeAlreadyUsed, [
        { field: 'code', message: RoleMessages.CodeAlreadyUsed },
      ]);
    }

    const permissionIds = await this.resolvePermissionIds(dto.permissionCodes);

    const created = await this.prisma.runInTransaction((tx) =>
      this.repository.create(
        { code: dto.code, name: dto.name, description: dto.description ?? null },
        permissionIds,
        tx,
      ),
    );

    await this.auditService.record({
      actorUserId,
      action: AuditAction.RoleCreated,
      entityType: AuditEntityType.Role,
      entityId: created.id,
      summary: `Se creó el rol ${created.code}.`,
      context,
    });

    return toRoleResponse(created);
  }

  private async resolvePermissionIds(codes: string[] | undefined): Promise<string[]> {
    if (!codes || codes.length === 0) return [];

    const found = await this.permissionsRepository.findByCodes(codes);

    if (found.length !== new Set(codes).size) {
      throw AppException.businessRule(RoleMessages.UnknownPermission);
    }

    return found.map((permission) => permission.id);
  }
}

/** Actualiza nombre y descripción de un rol. Los roles base no pueden renombrarse. */
@Injectable()
export class UpdateRoleUseCase {
  constructor(
    private readonly repository: RolesRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(id: string, dto: UpdateRoleDto, actorUserId: string, context: RequestContext) {
    const current = await this.repository.findById(id);

    if (!current) throw AppException.notFound(RoleMessages.NotFound);

    if (current.isSystem) {
      throw AppException.forbidden(RoleMessages.SystemRoleProtected);
    }

    const updated = await this.repository.updateInfo(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
    });

    await this.auditService.record({
      actorUserId,
      action: AuditAction.RoleUpdated,
      entityType: AuditEntityType.Role,
      entityId: id,
      summary: `Se actualizó el rol ${updated.code}.`,
      context,
    });

    return toRoleResponse(updated);
  }
}

/**
 * Reemplaza por completo los permisos de un rol.
 *
 * A diferencia del nombre y la descripción, los permisos de un rol base
 * (`ADMIN`, por ejemplo) sí pueden ajustarse: es el mecanismo previsto para
 * afinar la matriz de acceso desde el panel sin tocar código.
 */
@Injectable()
export class UpdateRolePermissionsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: RolesRepository,
    private readonly permissionsRepository: PermissionsRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    id: string,
    dto: UpdateRolePermissionsDto,
    actorUserId: string,
    context: RequestContext,
  ) {
    const current = await this.repository.findById(id);

    if (!current) throw AppException.notFound(RoleMessages.NotFound);

    // El rol super administrador gobierna esta misma operación: si se le
    // retirara `roles.update`, nadie podría devolvérselo desde el producto y la
    // única salida sería intervenir la base de datos a mano.
    if ((current.code as RoleCode) === RoleCode.SuperAdmin) {
      throw AppException.forbidden(RoleMessages.SuperAdminPermissionsLocked);
    }

    const permissions = await this.permissionsRepository.findByCodes(dto.permissionCodes);

    if (permissions.length !== new Set(dto.permissionCodes).size) {
      throw AppException.businessRule(RoleMessages.UnknownPermission);
    }

    const updated = await this.prisma.runInTransaction((tx) =>
      this.repository.replacePermissions(
        id,
        permissions.map((permission) => permission.id),
        tx,
      ),
    );

    await this.auditService.record({
      actorUserId,
      action: AuditAction.RolePermissionsUpdated,
      entityType: AuditEntityType.Role,
      entityId: id,
      summary: `Se actualizaron los permisos del rol ${updated.code}.`,
      metadata: { permissionCodes: dto.permissionCodes },
      context,
    });

    return toRoleResponse(updated);
  }
}

/**
 * Elimina un rol personalizado.
 * Se rechaza para roles base del sistema y para roles que aún tienen usuarios.
 */
@Injectable()
export class DeleteRoleUseCase {
  constructor(
    private readonly repository: RolesRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(id: string, actorUserId: string, context: RequestContext): Promise<void> {
    const current = await this.repository.findById(id);

    if (!current) throw AppException.notFound(RoleMessages.NotFound);

    if (current.isSystem) {
      throw AppException.forbidden(RoleMessages.SystemRoleProtected);
    }

    const usersWithRole = await this.repository.countUsersWithRole(id);

    if (usersWithRole > 0) {
      throw AppException.conflict(RoleMessages.RoleInUse);
    }

    await this.repository.delete(id);

    await this.auditService.record({
      actorUserId,
      action: AuditAction.RoleDeleted,
      entityType: AuditEntityType.Role,
      entityId: id,
      summary: `Se eliminó el rol ${current.code}.`,
      context,
    });
  }
}
