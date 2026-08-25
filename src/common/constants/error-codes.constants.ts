/**
 * Códigos de error estables que los clientes (React Admin y Flutter) pueden
 * interpretar de forma programática. El mensaje puede cambiar; el código no.
 */
export enum ErrorCode {
  ValidationFailed = 'validation_failed',
  InvalidCredentials = 'invalid_credentials',
  AccountInactive = 'account_inactive',
  AccountBlocked = 'account_blocked',
  /** La cuenta existe pero aún no confirmó su correo. */
  EmailNotVerified = 'email_not_verified',
  AccountLocked = 'account_locked',
  Unauthenticated = 'unauthenticated',
  TokenExpired = 'token_expired',
  TokenInvalid = 'token_invalid',
  SessionExpired = 'session_expired',
  /** La sesión fue cerrada porque el usuario inició sesión en otro dispositivo. */
  SessionInvalidated = 'session_invalidated',
  Forbidden = 'forbidden',
  NotFound = 'not_found',
  Conflict = 'conflict',
  BusinessRule = 'business_rule',
  RateLimited = 'rate_limited',
  PayloadTooLarge = 'payload_too_large',
  UnsupportedFileType = 'unsupported_file_type',
  ExternalProviderError = 'external_provider_error',
  ExternalProviderUnavailable = 'external_provider_unavailable',
  InternalError = 'internal_error',
}
