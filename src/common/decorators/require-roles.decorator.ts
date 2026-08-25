import { SetMetadata } from '@nestjs/common';
import { RoleCode } from '@/common/enums/role-code.enum';

export const REQUIRED_ROLES_KEY = 'requiredRoles';

/**
 * Declara los roles admitidos por una ruta.
 *
 * Se usa para separar contextos completos (panel administrativo frente a
 * aplicación cliente). El control fino de acciones se hace con permisos.
 */
export const RequireRoles = (...roles: RoleCode[]) => SetMetadata(REQUIRED_ROLES_KEY, roles);
