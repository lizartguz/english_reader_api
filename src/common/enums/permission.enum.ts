/**
 * Catálogo central de permisos, expresados como `modulo.accion`.
 * Los guards y decoradores deben referenciar estos valores y nunca texto suelto.
 */
export enum PermissionCode {
  // Usuarios
  UsersRead = 'users.read',
  UsersCreate = 'users.create',
  UsersUpdate = 'users.update',
  UsersDelete = 'users.delete',
  /** Permite operar sobre usuarios con rol administrativo. Reservado a SUPER_ADMIN. */
  UsersManageAdmins = 'users.manage_admins',

  // Roles y permisos
  RolesRead = 'roles.read',
  RolesCreate = 'roles.create',
  RolesUpdate = 'roles.update',
  RolesDelete = 'roles.delete',
  RolesAssign = 'roles.assign',
  PermissionsRead = 'permissions.read',

  // Historias
  StoriesRead = 'stories.read',
  StoriesCreate = 'stories.create',
  StoriesUpdate = 'stories.update',
  StoriesDelete = 'stories.delete',
  StoriesPublish = 'stories.publish',

  // Niveles de lectura
  ReadingLevelsRead = 'reading_levels.read',
  ReadingLevelsCreate = 'reading_levels.create',
  ReadingLevelsUpdate = 'reading_levels.update',
  ReadingLevelsDelete = 'reading_levels.delete',

  // Géneros literarios
  GenresRead = 'genres.read',
  GenresCreate = 'genres.create',
  GenresUpdate = 'genres.update',
  GenresDelete = 'genres.delete',

  // Archivos y recursos
  FilesRead = 'files.read',
  FilesUpload = 'files.upload',
  FilesDelete = 'files.delete',

  // Palabras y diccionario
  WordsRead = 'words.read',
  WordsCreate = 'words.create',
  WordsUpdate = 'words.update',
  WordsDelete = 'words.delete',
  WordsReview = 'words.review',

  // Traducciones
  TranslationsRead = 'translations.read',
  TranslationsCreate = 'translations.create',
  TranslationsUpdate = 'translations.update',
  TranslationsDelete = 'translations.delete',
  TranslationsReview = 'translations.review',

  // Vocabulario y progreso (consulta administrativa)
  VocabularyRead = 'vocabulary.read',
  ReadingProgressRead = 'reading_progress.read',

  // Trazabilidad
  AuditRead = 'audit.read',
  SystemLogsRead = 'system_logs.read',
}

/** Descripción legible de cada permiso, usada por los seeders y el panel. */
export const PERMISSION_DESCRIPTIONS: Record<PermissionCode, string> = {
  [PermissionCode.UsersRead]: 'Consultar usuarios.',
  [PermissionCode.UsersCreate]: 'Crear usuarios.',
  [PermissionCode.UsersUpdate]: 'Editar usuarios.',
  [PermissionCode.UsersDelete]: 'Eliminar usuarios.',
  [PermissionCode.UsersManageAdmins]: 'Gestionar usuarios con rol administrativo.',
  [PermissionCode.RolesRead]: 'Consultar roles.',
  [PermissionCode.RolesCreate]: 'Crear roles.',
  [PermissionCode.RolesUpdate]: 'Editar roles.',
  [PermissionCode.RolesDelete]: 'Eliminar roles.',
  [PermissionCode.RolesAssign]: 'Asignar roles y permisos.',
  [PermissionCode.PermissionsRead]: 'Consultar el catálogo de permisos.',
  [PermissionCode.StoriesRead]: 'Consultar historias.',
  [PermissionCode.StoriesCreate]: 'Crear historias.',
  [PermissionCode.StoriesUpdate]: 'Editar historias.',
  [PermissionCode.StoriesDelete]: 'Eliminar historias.',
  [PermissionCode.StoriesPublish]: 'Publicar o archivar historias.',
  [PermissionCode.ReadingLevelsRead]: 'Consultar niveles de lectura.',
  [PermissionCode.ReadingLevelsCreate]: 'Crear niveles de lectura.',
  [PermissionCode.ReadingLevelsUpdate]: 'Editar niveles de lectura.',
  [PermissionCode.ReadingLevelsDelete]: 'Eliminar niveles de lectura.',
  [PermissionCode.GenresRead]: 'Consultar géneros literarios.',
  [PermissionCode.GenresCreate]: 'Crear géneros literarios.',
  [PermissionCode.GenresUpdate]: 'Editar géneros literarios.',
  [PermissionCode.GenresDelete]: 'Eliminar géneros literarios.',
  [PermissionCode.FilesRead]: 'Descargar archivos protegidos.',
  [PermissionCode.FilesUpload]: 'Cargar archivos y recursos.',
  [PermissionCode.FilesDelete]: 'Eliminar archivos y recursos.',
  [PermissionCode.WordsRead]: 'Consultar palabras del diccionario.',
  [PermissionCode.WordsCreate]: 'Crear palabras manualmente.',
  [PermissionCode.WordsUpdate]: 'Editar palabras del diccionario.',
  [PermissionCode.WordsDelete]: 'Eliminar palabras del diccionario.',
  [PermissionCode.WordsReview]: 'Revisar y aprobar palabras.',
  [PermissionCode.TranslationsRead]: 'Consultar traducciones.',
  [PermissionCode.TranslationsCreate]: 'Crear traducciones.',
  [PermissionCode.TranslationsUpdate]: 'Editar traducciones.',
  [PermissionCode.TranslationsDelete]: 'Eliminar traducciones.',
  [PermissionCode.TranslationsReview]: 'Revisar y aprobar traducciones.',
  [PermissionCode.VocabularyRead]: 'Consultar vocabulario guardado por los usuarios.',
  [PermissionCode.ReadingProgressRead]: 'Consultar progreso de lectura de los usuarios.',
  [PermissionCode.AuditRead]: 'Consultar la auditoría administrativa.',
  [PermissionCode.SystemLogsRead]: 'Consultar los registros técnicos del sistema.',
};

/** Todos los permisos existentes, en orden de declaración. */
export const ALL_PERMISSIONS: readonly PermissionCode[] = Object.values(PermissionCode);

/**
 * Descompone un código de permiso en módulo y acción para persistirlo
 * en las columnas `permissions.module` y `permissions.action`.
 */
export function splitPermissionCode(code: PermissionCode): { module: string; action: string } {
  const [module, action] = code.split('.');
  return { module, action };
}
