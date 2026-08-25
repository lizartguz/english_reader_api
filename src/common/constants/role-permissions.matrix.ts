import { PermissionCode, ALL_PERMISSIONS } from '@/common/enums/permission.enum';
import { RoleCode } from '@/common/enums/role-code.enum';

/**
 * Matriz inicial de permisos por rol, derivada de
 * `docs/planning/02-seguridad-autenticacion-autorizacion.md`.
 *
 * Reglas aplicadas:
 * - `SUPER_ADMIN` es el rol raíz y recibe todos los permisos.
 * - `ADMIN` opera contenido y usuarios cliente, pero no administra roles,
 *   administradores, auditoría ni registros técnicos.
 * - `CLIENT` no recibe permisos administrativos; su acceso se limita a las
 *   rutas `/app`, que se protegen por rol y por propiedad del recurso.
 *
 * La matriz solo define el estado inicial. Una vez creada la base, los permisos
 * se administran como datos desde el panel y no se recalculan desde el código.
 */
export const ROLE_PERMISSIONS_MATRIX: Record<RoleCode, readonly PermissionCode[]> = {
  [RoleCode.SuperAdmin]: ALL_PERMISSIONS,

  [RoleCode.Admin]: [
    PermissionCode.UsersRead,
    PermissionCode.UsersCreate,
    PermissionCode.UsersUpdate,
    PermissionCode.UsersDelete,

    PermissionCode.RolesRead,
    PermissionCode.RolesAssign,
    PermissionCode.PermissionsRead,

    PermissionCode.StoriesRead,
    PermissionCode.StoriesCreate,
    PermissionCode.StoriesUpdate,
    PermissionCode.StoriesDelete,
    PermissionCode.StoriesPublish,

    PermissionCode.ReadingLevelsRead,
    PermissionCode.ReadingLevelsCreate,
    PermissionCode.ReadingLevelsUpdate,
    PermissionCode.ReadingLevelsDelete,

    PermissionCode.GenresRead,
    PermissionCode.GenresCreate,
    PermissionCode.GenresUpdate,
    PermissionCode.GenresDelete,

    PermissionCode.FilesRead,
    PermissionCode.FilesUpload,
    PermissionCode.FilesDelete,

    PermissionCode.WordsRead,
    PermissionCode.WordsCreate,
    PermissionCode.WordsUpdate,
    PermissionCode.WordsDelete,
    PermissionCode.WordsReview,

    PermissionCode.TranslationsRead,
    PermissionCode.TranslationsCreate,
    PermissionCode.TranslationsUpdate,
    PermissionCode.TranslationsDelete,
    PermissionCode.TranslationsReview,

    PermissionCode.VocabularyRead,
    PermissionCode.ReadingProgressRead,
  ],

  [RoleCode.Client]: [],
};

/** Definición de los roles base creados por los seeders. */
export const SYSTEM_ROLES: ReadonlyArray<{
  code: RoleCode;
  name: string;
  description: string;
}> = [
  {
    code: RoleCode.SuperAdmin,
    name: 'Super administrador',
    description: 'Rol raíz con control total del sistema.',
  },
  {
    code: RoleCode.Admin,
    name: 'Administrador',
    description: 'Gestiona contenido, niveles, palabras y usuarios cliente.',
  },
  {
    code: RoleCode.Client,
    name: 'Cliente',
    description: 'Usuario final de la aplicación de lectura.',
  },
];
