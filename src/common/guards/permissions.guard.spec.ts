import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PermissionCode } from '@/common/enums/permission.enum';
import { RoleCode } from '@/common/enums/role-code.enum';
import { AppException } from '@/common/exceptions/app.exception';
import type { AuthenticatedUser } from '@/common/types/authenticated-user.type';

/** Construye un usuario autenticado mínimo para las pruebas. */
function buildUser(roles: string[], permissions: string[]): AuthenticatedUser {
  return {
    id: 'user-1',
    email: 'user@test.local',
    firstName: 'Test',
    lastName: 'User',
    status: 'active',
    roles,
    permissions,
    sessionId: 'session-1',
    sessionExpiresAt: new Date(Date.now() + 3600_000),
  };
}

/** Simula el contexto de ejecución de Nest con el usuario indicado. */
function buildContext(user?: AuthenticatedUser): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

/** Reflector que devuelve metadatos fijos según la clave consultada. */
function buildReflector(metadata: Record<string, unknown>): Reflector {
  return {
    getAllAndOverride: (key: string) => metadata[key],
  } as unknown as Reflector;
}

describe('PermissionsGuard', () => {
  const REQUIRED_KEY = 'requiredPermissions';
  const PUBLIC_KEY = 'isPublic';

  it('deja pasar las rutas públicas', () => {
    const guard = new PermissionsGuard(buildReflector({ [PUBLIC_KEY]: true }));

    expect(guard.canActivate(buildContext())).toBe(true);
  });

  it('deja pasar cuando la ruta no exige permisos', () => {
    const guard = new PermissionsGuard(buildReflector({}));

    expect(guard.canActivate(buildContext(buildUser([RoleCode.Client], [])))).toBe(true);
  });

  it('permite el acceso cuando el usuario tiene el permiso exigido', () => {
    const guard = new PermissionsGuard(
      buildReflector({ [REQUIRED_KEY]: [PermissionCode.StoriesUpdate] }),
    );
    const user = buildUser([RoleCode.Admin], [PermissionCode.StoriesUpdate]);

    expect(guard.canActivate(buildContext(user))).toBe(true);
  });

  it('basta con tener uno de los permisos declarados', () => {
    const guard = new PermissionsGuard(
      buildReflector({
        [REQUIRED_KEY]: [PermissionCode.StoriesUpdate, PermissionCode.StoriesPublish],
      }),
    );
    const user = buildUser([RoleCode.Admin], [PermissionCode.StoriesPublish]);

    expect(guard.canActivate(buildContext(user))).toBe(true);
  });

  it('rechaza al usuario sin el permiso exigido', () => {
    const guard = new PermissionsGuard(
      buildReflector({ [REQUIRED_KEY]: [PermissionCode.SystemLogsRead] }),
    );
    const user = buildUser([RoleCode.Admin], [PermissionCode.StoriesRead]);

    expect(() => guard.canActivate(buildContext(user))).toThrow(AppException);
  });

  it('el rol raíz SUPER_ADMIN no se evalúa contra la matriz', () => {
    const guard = new PermissionsGuard(
      buildReflector({ [REQUIRED_KEY]: [PermissionCode.SystemLogsRead] }),
    );
    const user = buildUser([RoleCode.SuperAdmin], []);

    expect(guard.canActivate(buildContext(user))).toBe(true);
  });

  it('rechaza cuando no hay usuario autenticado', () => {
    const guard = new PermissionsGuard(
      buildReflector({ [REQUIRED_KEY]: [PermissionCode.StoriesRead] }),
    );

    expect(() => guard.canActivate(buildContext())).toThrow(AppException);
  });
});
