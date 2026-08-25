import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import {
  ALL_PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
  splitPermissionCode,
} from '@/common/enums/permission.enum';
import { ROLE_PERMISSIONS_MATRIX, SYSTEM_ROLES } from '@/common/constants/role-permissions.matrix';
import { RoleCode } from '@/common/enums/role-code.enum';

/**
 * Crea el catálogo de permisos, los roles base y la matriz inicial que los
 * relaciona.
 *
 * Es idempotente: puede ejecutarse varias veces sin duplicar registros. Solo
 * asigna permisos que aún no existan en el rol, de modo que los ajustes hechos
 * después desde el panel no se revierten al volver a sembrar.
 */
@Injectable()
export class RolesPermissionsSeeder {
  private readonly logger = new Logger(RolesPermissionsSeeder.name);

  constructor(private readonly prisma: PrismaService) {}

  async run(): Promise<void> {
    await this.seedPermissions();
    await this.seedRoles();
    await this.seedMatrix();
  }

  /** Registra todos los permisos declarados en el catálogo central. */
  private async seedPermissions(): Promise<void> {
    for (const code of ALL_PERMISSIONS) {
      const { module, action } = splitPermissionCode(code);

      await this.prisma.permission.upsert({
        where: { code },
        update: { module, action, description: PERMISSION_DESCRIPTIONS[code] },
        create: { code, module, action, description: PERMISSION_DESCRIPTIONS[code] },
      });
    }

    this.logger.log(`Permisos sincronizados: ${ALL_PERMISSIONS.length}.`);
  }

  /** Registra los roles base y los marca como protegidos del sistema. */
  private async seedRoles(): Promise<void> {
    for (const role of SYSTEM_ROLES) {
      await this.prisma.role.upsert({
        where: { code: role.code },
        update: { name: role.name, description: role.description, isSystem: true },
        create: { code: role.code, name: role.name, description: role.description, isSystem: true },
      });
    }

    this.logger.log(`Roles base sincronizados: ${SYSTEM_ROLES.length}.`);
  }

  /** Asigna a cada rol los permisos que le corresponden según la matriz inicial. */
  private async seedMatrix(): Promise<void> {
    for (const [roleCode, permissions] of Object.entries(ROLE_PERMISSIONS_MATRIX)) {
      if (permissions.length === 0) continue;

      const role = await this.prisma.role.findUniqueOrThrow({
        where: { code: roleCode as RoleCode },
        select: { id: true },
      });

      const permissionRows = await this.prisma.permission.findMany({
        where: { code: { in: [...permissions] } },
        select: { id: true },
      });

      await this.prisma.rolePermission.createMany({
        data: permissionRows.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
        skipDuplicates: true,
      });

      this.logger.log(`Rol ${roleCode}: ${permissionRows.length} permisos asignados.`);
    }
  }
}
