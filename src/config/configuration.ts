import { registerAs } from '@nestjs/config';
import { AppEnvironment } from './env.validation';

/** Convierte una variable de entorno a número con valor por defecto. */
const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Convierte una variable de entorno a booleano con valor por defecto. */
const toBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
};

/** Convierte una lista separada por comas en un arreglo limpio. */
const toList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

/** Configuración general de la aplicación. */
export const appConfig = registerAs('app', () => ({
  env: (process.env.APP_ENV ?? AppEnvironment.Development) as AppEnvironment,
  name: process.env.APP_NAME ?? 'English Reader API',
  url: process.env.APP_URL ?? 'http://localhost:3000',
  port: toInt(process.env.PORT, 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  apiVersion: process.env.API_VERSION ?? 'v1',
  swaggerEnabled: toBool(process.env.SWAGGER_ENABLED, true),
  corsOrigins: toList(process.env.CORS_ORIGINS),
}));

/** Configuración de tokens, sesiones y políticas de acceso. */
export const securityConfig = registerAs('security', () => ({
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET as string,
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },
  // Límite absoluto de sesión para usuarios del panel administrativo.
  adminSessionMaxHours: toInt(process.env.ADMIN_SESSION_MAX_HOURS, 8),
  passwordResetTtlMinutes: toInt(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES, 30),
  loginMaxFailedAttempts: toInt(process.env.LOGIN_MAX_FAILED_ATTEMPTS, 5),
  loginLockMinutes: toInt(process.env.LOGIN_LOCK_MINUTES, 15),
  throttle: {
    ttlSeconds: toInt(process.env.THROTTLE_TTL_SECONDS, 60),
    limit: toInt(process.env.THROTTLE_LIMIT, 120),
    authTtlSeconds: toInt(process.env.THROTTLE_AUTH_TTL_SECONDS, 60),
    authLimit: toInt(process.env.THROTTLE_AUTH_LIMIT, 10),
  },
}));

/** Configuración del proveedor de correo saliente. */
export const mailConfig = registerAs('mail', () => ({
  host: process.env.MAIL_HOST ?? '',
  port: toInt(process.env.MAIL_PORT, 587),
  username: process.env.MAIL_USERNAME ?? '',
  password: process.env.MAIL_PASSWORD ?? '',
  fromAddress: process.env.MAIL_FROM_ADDRESS ?? 'no-reply@englishreader.local',
  fromName: process.env.MAIL_FROM_NAME ?? 'English Reader',
  secure: toBool(process.env.MAIL_SECURE, false),
  passwordResetUrl: process.env.PASSWORD_RESET_URL ?? 'http://localhost:5173/reset-password',
}));

/** Configuración de almacenamiento y límites de carga de archivos. */
export const storageConfig = registerAs('storage', () => ({
  disk: process.env.STORAGE_DISK ?? 'local',
  privatePath: process.env.STORAGE_PRIVATE_PATH ?? './storage/private',
  maxImageSizeBytes: toInt(process.env.MAX_IMAGE_SIZE_MB, 10) * 1024 * 1024,
  maxAudioSizeBytes: toInt(process.env.MAX_AUDIO_SIZE_MB, 15) * 1024 * 1024,
  imageMaxWidth: toInt(process.env.IMAGE_MAX_WIDTH, 1600),
  imageWebpQuality: toInt(process.env.IMAGE_WEBP_QUALITY, 82),
}));

/** Configuración de proveedores externos de diccionario y traducción. */
export const externalConfig = registerAs('external', () => ({
  dictionaryUrl:
    process.env.EXTERNAL_DICTIONARY_URL ?? 'https://api.dictionaryapi.dev/api/v2/entries/en',
  translationUrl: process.env.EXTERNAL_TRANSLATION_URL ?? 'https://libretranslate.com',
  translationApiKey: process.env.EXTERNAL_TRANSLATION_API_KEY ?? '',
  timeoutMs: toInt(process.env.EXTERNAL_TIMEOUT_MS, 8000),
}));

/** Política de retención de registros técnicos y de auditoría. */
export const retentionConfig = registerAs('retention', () => ({
  systemLogsMonths: toInt(process.env.SYSTEM_LOGS_RETENTION_MONTHS, 6),
  auditLogsMonths: toInt(process.env.AUDIT_LOGS_RETENTION_MONTHS, 24),
  cronEnabled: toBool(process.env.RETENTION_CRON_ENABLED, true),
}));

/** Configuracion de las cookies de sesion usadas por el panel web. */
export const cookieConfig = registerAs('cookie', () => ({
  refreshName: process.env.REFRESH_COOKIE_NAME ?? 'er_refresh_token',
  csrfName: process.env.CSRF_COOKIE_NAME ?? 'er_csrf_token',
  secure: toBool(process.env.COOKIE_SECURE, true),
  sameSite: (process.env.COOKIE_SAME_SITE ?? 'none') as 'lax' | 'strict' | 'none',
  domain: process.env.COOKIE_DOMAIN || undefined,
}));

/** Configuracion de la verificacion de correo del registro de clientes. */
export const verificationConfig = registerAs('verification', () => ({
  tokenTtlHours: toInt(process.env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS, 24),
  verificationUrl: process.env.EMAIL_VERIFICATION_URL ?? 'http://localhost:5173/verify-email',
}));

/** Cadena de conexion a la base de datos. */
export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL as string,
}));

export const configurations = [
  cookieConfig,
  verificationConfig,
  appConfig,
  securityConfig,
  mailConfig,
  storageConfig,
  externalConfig,
  retentionConfig,
  databaseConfig,
];
