/**
 * Catálogo de mensajes en español devueltos al cliente.
 *
 * Los mensajes deben ser amigables y seguros: nunca exponen detalles técnicos,
 * consultas SQL, nombres internos ni información que ayude a enumerar datos.
 */

/** Mensajes genéricos reutilizables por cualquier módulo. */
export const CommonMessages = {
  Success: 'Operación completada.',
  Created: 'Registro creado correctamente.',
  Updated: 'Registro actualizado correctamente.',
  Deleted: 'Registro eliminado correctamente.',
  Restored: 'Registro restaurado correctamente.',
  Retrieved: 'Consulta realizada correctamente.',
  NotFound: 'No se encontró el recurso solicitado.',
  ValidationFailed: 'Revisa los datos enviados e inténtalo nuevamente.',
  Forbidden: 'No tienes permisos para realizar esta acción.',
  Unauthenticated: 'Debes iniciar sesión para continuar.',
  Conflict: 'La operación entra en conflicto con el estado actual del recurso.',
  RateLimited: 'Demasiadas solicitudes. Espera unos segundos e inténtalo nuevamente.',
  InternalError: 'No se pudo completar la operación. Inténtalo nuevamente.',
  ExternalUnavailable:
    'El servicio externo no está disponible en este momento. Inténtalo más tarde.',
} as const;

/** Mensajes de autenticación, sesiones y recuperación de acceso. */
export const AuthMessages = {
  LoginSuccess: 'Sesión iniciada correctamente.',
  LogoutSuccess: 'Sesión cerrada correctamente.',
  RefreshSuccess: 'Sesión renovada correctamente.',
  SessionValid: 'La sesión está activa.',
  ProfileRetrieved: 'Perfil obtenido correctamente.',
  // Mensaje deliberadamente ambiguo: no revela si falló el correo o la contraseña.
  InvalidCredentials: 'Correo o contraseña incorrectos.',
  AccountInactive: 'Tu cuenta no está activa. Contacta al administrador.',
  AccountBlocked: 'Tu cuenta está bloqueada. Contacta al administrador.',
  EmailNotVerified:
    'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.',
  AccountLocked:
    'Por seguridad, tu cuenta quedó bloqueada temporalmente tras varios intentos fallidos.',
  SessionExpired: 'Tu sesión ha expirado. Inicia sesión nuevamente.',
  SessionInvalidated: 'Tu sesión fue cerrada porque se inició en otro dispositivo.',
  SessionRevokedForSecurity: 'Tu sesión fue cerrada por seguridad. Inicia sesión nuevamente.',
  SessionRevokedPasswordChanged: 'Tu sesión fue cerrada porque se actualizó la contraseña de tu cuenta.',
  TokenInvalid: 'La sesión no es válida. Inicia sesión nuevamente.',
  AdminAreaForbidden: 'Esta cuenta no tiene acceso al panel administrativo.',
  ClientAreaForbidden: 'Esta cuenta no tiene acceso a la aplicación de lectura.',
  // Respuesta genérica: no debe revelar si el correo existe en el sistema.
  PasswordResetRequested:
    'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.',
  PasswordResetCompleted: 'Tu contraseña fue actualizada correctamente.',
  PasswordResetTokenInvalid: 'El enlace de recuperación no es válido o ya expiró.',
  EmailVerificationTokenInvalid: 'El enlace de verificación no es válido o ya expiró.',
  PasswordChanged: 'Tu contraseña fue actualizada correctamente.',
  CurrentPasswordInvalid: 'La contraseña actual no es correcta.',
} as const;

/** Mensajes de usuarios. */
export const UserMessages = {
  Created: 'Usuario creado correctamente.',
  Updated: 'Usuario actualizado correctamente.',
  Deleted: 'Usuario eliminado correctamente.',
  Restored: 'Usuario restaurado correctamente.',
  StatusChanged: 'Estado del usuario actualizado correctamente.',
  RolesAssigned: 'Roles asignados correctamente.',
  Retrieved: 'Usuarios obtenidos correctamente.',
  NotFound: 'No se encontró el usuario solicitado.',
  EmailAlreadyUsed: 'Ya existe un usuario registrado con ese correo.',
  PhoneAlreadyUsed: 'Ya existe un usuario registrado con ese teléfono.',
  CannotManageAdmins: 'No tienes permisos para gestionar usuarios administradores.',
  CannotManageSuperAdmin: 'No es posible modificar a un super administrador.',
  CannotModifySelfStatus: 'No puedes cambiar el estado de tu propia cuenta.',
  CannotDeleteSelf: 'No puedes eliminar tu propia cuenta.',
  RoleRequired: 'Debes asignar al menos un rol al usuario.',
} as const;

/** Mensajes de roles y permisos. */
export const RoleMessages = {
  Created: 'Rol creado correctamente.',
  Updated: 'Rol actualizado correctamente.',
  Deleted: 'Rol eliminado correctamente.',
  PermissionsUpdated: 'Permisos del rol actualizados correctamente.',
  Retrieved: 'Roles obtenidos correctamente.',
  NotFound: 'No se encontró el rol solicitado.',
  CodeAlreadyUsed: 'Ya existe un rol con ese código.',
  SystemRoleProtected: 'Los roles base del sistema no pueden eliminarse ni renombrarse.',
  RoleInUse: 'No es posible eliminar un rol que aún tiene usuarios asignados.',
  UnknownPermission: 'Uno o más permisos enviados no existen.',
} as const;

/** Mensajes de niveles de lectura. */
export const ReadingLevelMessages = {
  Created: 'Nivel de lectura creado correctamente.',
  Updated: 'Nivel de lectura actualizado correctamente.',
  Deleted: 'Nivel de lectura eliminado correctamente.',
  Retrieved: 'Niveles de lectura obtenidos correctamente.',
  NotFound: 'No se encontró el nivel de lectura solicitado.',
  CodeAlreadyUsed: 'Ya existe un nivel de lectura con ese código.',
  LevelInUse: 'No es posible eliminar un nivel que aún tiene historias asociadas.',
  LevelInactive: 'El nivel de lectura seleccionado no está activo.',
} as const;

/** Mensajes de géneros literarios. */
export const GenreMessages = {
  Created: 'Género creado correctamente.',
  Updated: 'Género actualizado correctamente.',
  Deleted: 'Género eliminado correctamente.',
  Retrieved: 'Géneros obtenidos correctamente.',
  NotFound: 'No se encontró el género solicitado.',
  CodeAlreadyUsed: 'Ya existe un género con ese código.',
  GenreInUse: 'No es posible eliminar un género que aún tiene historias asociadas.',
  UnknownGenre: 'Uno o más géneros enviados no existen.',
} as const;

/** Mensajes de historias y recursos asociados. */
export const StoryMessages = {
  Created: 'Historia guardada correctamente.',
  Updated: 'Historia actualizada correctamente.',
  Deleted: 'Historia eliminada correctamente.',
  StatusChanged: 'Estado de la historia actualizado correctamente.',
  Retrieved: 'Historias obtenidas correctamente.',
  NotFound: 'No se encontró la historia solicitada.',
  NotAvailable: 'Esta historia no está disponible.',
  SlugAlreadyUsed: 'Ya existe una historia con ese identificador de URL.',
  CannotPublishWithoutActiveLevel:
    'No es posible publicar una historia cuyo nivel de lectura está inactivo.',
  InvalidStatusTransition: 'El cambio de estado solicitado no está permitido.',
  AssetUploaded: 'Recurso cargado correctamente.',
  AssetDeleted: 'Recurso eliminado correctamente.',
  AssetNotFound: 'No se encontró el recurso solicitado.',
} as const;

/** Mensajes de diccionario, palabras y traducciones. */
export const DictionaryMessages = {
  WordRetrieved: 'Palabra consultada correctamente.',
  WordsRetrieved: 'Palabras obtenidas correctamente.',
  WordCreated: 'Palabra creada correctamente.',
  WordUpdated: 'Palabra actualizada correctamente.',
  WordDeleted: 'Palabra eliminada correctamente.',
  WordReviewed: 'Revisión de la palabra registrada correctamente.',
  WordNotFound: 'No se encontró información para la palabra solicitada.',
  WordAlreadyExists: 'Esa palabra ya existe en el diccionario.',
  TranslationCreated: 'Traducción creada correctamente.',
  TranslationUpdated: 'Traducción actualizada correctamente.',
  TranslationDeleted: 'Traducción eliminada correctamente.',
  TranslationReviewed: 'Revisión de la traducción registrada correctamente.',
  TranslationsRetrieved: 'Traducciones obtenidas correctamente.',
  TranslationNotFound: 'No se encontró la traducción solicitada.',
  ProviderUnavailable:
    'No fue posible consultar el diccionario en este momento. Inténtalo más tarde.',
  InvalidWord: 'La palabra enviada no es válida.',
} as const;

/** Mensajes de vocabulario personal. */
export const VocabularyMessages = {
  Saved: 'Palabra guardada en tu vocabulario.',
  AlreadySaved: 'Esta palabra ya está en tu vocabulario.',
  Updated: 'Vocabulario actualizado correctamente.',
  Removed: 'Palabra eliminada de tu vocabulario.',
  NotFound: 'No se encontró la palabra en tu vocabulario.',
  Retrieved: 'Vocabulario obtenido correctamente.',
} as const;

/** Mensajes de progreso de lectura. */
export const ReadingProgressMessages = {
  Saved: 'Progreso guardado correctamente.',
  Retrieved: 'Progreso obtenido correctamente.',
  NotFound: 'No se encontró progreso para esta historia.',
} as const;

/** Mensajes de archivos. */
export const FileMessages = {
  Uploaded: 'Archivo cargado correctamente.',
  Deleted: 'Archivo eliminado correctamente.',
  NotFound: 'No se encontró el archivo solicitado.',
  TooLarge: 'El archivo supera el tamaño máximo permitido.',
  UnsupportedType: 'El formato del archivo no está permitido.',
  Required: 'Debes adjuntar un archivo.',
  StorageFailure: 'No se pudo almacenar el archivo. Inténtalo nuevamente.',
} as const;

/** Mensajes de trazabilidad. */
export const LogMessages = {
  AuditRetrieved: 'Auditoría obtenida correctamente.',
  SystemLogsRetrieved: 'Registros del sistema obtenidos correctamente.',
  SystemLogNotFound: 'No se encontró el registro solicitado.',
} as const;
