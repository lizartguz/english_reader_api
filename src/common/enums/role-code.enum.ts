/**
 * Códigos de los roles base del sistema.
 * Coinciden con la columna `roles.code` y no deben escribirse como texto suelto.
 */
export enum RoleCode {
  SuperAdmin = 'SUPER_ADMIN',
  Admin = 'ADMIN',
  Client = 'CLIENT',
}

/** Roles que pueden acceder al panel administrativo React. */
export const ADMIN_PANEL_ROLES: readonly RoleCode[] = [RoleCode.SuperAdmin, RoleCode.Admin];

/** Roles que representan a un usuario administrativo (no cliente). */
export const ADMINISTRATIVE_ROLES: readonly RoleCode[] = [RoleCode.SuperAdmin, RoleCode.Admin];
