import { SetMetadata } from '@nestjs/common';
import { PermissionCode } from '@/common/enums/permission.enum';

export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Declara los permisos que exige una ruta.
 *
 * El controlador solo declara la exigencia; la evaluación ocurre en
 * `PermissionsGuard`, de modo que la lógica de autorización no se disperse.
 * Cuando se indican varios permisos, basta con tener uno de ellos.
 */
export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
