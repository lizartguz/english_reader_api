/**
 * Acciones registradas en `audit_logs`. Representan hechos de negocio,
 * no errores técnicos (esos viven en `system_logs`).
 */
export enum AuditAction {
  AuthLogin = 'auth.login',
  AuthLogout = 'auth.logout',
  AuthPasswordResetRequested = 'auth.password_reset_requested',
  AuthPasswordResetCompleted = 'auth.password_reset_completed',
  AuthPasswordChanged = 'auth.password_changed',

  UserCreated = 'user.created',
  UserUpdated = 'user.updated',
  UserDeleted = 'user.deleted',
  UserRestored = 'user.restored',
  UserStatusChanged = 'user.status_changed',
  UserRolesAssigned = 'user.roles_assigned',

  RoleCreated = 'role.created',
  RoleUpdated = 'role.updated',
  RoleDeleted = 'role.deleted',
  RolePermissionsUpdated = 'role.permissions_updated',

  ReadingLevelCreated = 'reading_level.created',
  ReadingLevelUpdated = 'reading_level.updated',
  ReadingLevelDeleted = 'reading_level.deleted',

  GenreCreated = 'genre.created',
  GenreUpdated = 'genre.updated',
  GenreDeleted = 'genre.deleted',

  StoryCreated = 'story.created',
  StoryUpdated = 'story.updated',
  StoryDeleted = 'story.deleted',
  StoryStatusChanged = 'story.status_changed',
  StoryAssetUploaded = 'story.asset_uploaded',
  StoryAssetDeleted = 'story.asset_deleted',

  WordCreated = 'word.created',
  WordUpdated = 'word.updated',
  WordDeleted = 'word.deleted',
  WordReviewed = 'word.reviewed',

  TranslationCreated = 'translation.created',
  TranslationUpdated = 'translation.updated',
  TranslationDeleted = 'translation.deleted',
  TranslationReviewed = 'translation.reviewed',
}

/** Tipos de entidad usados en `audit_logs.entity_type`. */
export enum AuditEntityType {
  User = 'User',
  Role = 'Role',
  Permission = 'Permission',
  ReadingLevel = 'ReadingLevel',
  Genre = 'Genre',
  Story = 'Story',
  StoryAsset = 'StoryAsset',
  WordEntry = 'WordEntry',
  WordTranslation = 'WordTranslation',
  Session = 'Session',
}
