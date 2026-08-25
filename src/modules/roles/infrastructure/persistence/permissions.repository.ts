import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

/**
 * Acceso de solo lectura al catálogo de permisos.
 *
 * El catálogo se administra por código (`PermissionCode`) y se sincroniza con
 * los seeders; el panel administrativo solo lo consulta para construir el
 * editor de permisos de un rol.
 */
@Injectable()
export class PermissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
      select: { id: true, code: true, module: true, action: true, description: true },
    });
  }

  findByCodes(codes: string[]) {
    return this.prisma.permission.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true },
    });
  }
}
