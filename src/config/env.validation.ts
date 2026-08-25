import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

/**
 * Ambientes soportados por la API.
 */
export enum AppEnvironment {
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
  Test = 'test',
}

/**
 * Contrato de variables de entorno. Se valida al arrancar para fallar temprano
 * cuando falte configuración crítica en lugar de romper en tiempo de ejecución.
 */
class EnvironmentVariables {
  @IsEnum(AppEnvironment)
  APP_ENV!: AppEnvironment;

  @IsOptional()
  @IsString()
  APP_NAME?: string;

  @IsOptional()
  @IsString()
  APP_URL?: string;

  @IsOptional()
  @IsNumberString()
  PORT?: string;

  @IsOptional()
  @IsString()
  API_PREFIX?: string;

  @IsOptional()
  @IsString()
  API_VERSION?: string;

  @IsOptional()
  @IsBooleanString()
  SWAGGER_ENABLED?: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET debe tener al menos 32 caracteres.' })
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres.' })
  JWT_REFRESH_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_EXPIRES_IN?: string;

  @IsOptional()
  @IsNumberString()
  ADMIN_SESSION_MAX_HOURS?: string;

  @IsOptional()
  @IsNumberString()
  PASSWORD_RESET_TOKEN_TTL_MINUTES?: string;

  @IsOptional()
  @IsNumberString()
  LOGIN_MAX_FAILED_ATTEMPTS?: string;

  @IsOptional()
  @IsNumberString()
  LOGIN_LOCK_MINUTES?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @IsOptional()
  @IsNumberString()
  THROTTLE_TTL_SECONDS?: string;

  @IsOptional()
  @IsNumberString()
  THROTTLE_LIMIT?: string;

  @IsOptional()
  @IsNumberString()
  THROTTLE_AUTH_TTL_SECONDS?: string;

  @IsOptional()
  @IsNumberString()
  THROTTLE_AUTH_LIMIT?: string;

  @IsOptional()
  @IsString()
  MAIL_HOST?: string;

  @IsOptional()
  @IsNumberString()
  MAIL_PORT?: string;

  @IsOptional()
  @IsString()
  MAIL_USERNAME?: string;

  @IsOptional()
  @IsString()
  MAIL_PASSWORD?: string;

  @IsOptional()
  @IsString()
  MAIL_FROM_ADDRESS?: string;

  @IsOptional()
  @IsString()
  MAIL_FROM_NAME?: string;

  @IsOptional()
  @IsBooleanString()
  MAIL_SECURE?: string;

  @IsOptional()
  @IsString()
  PASSWORD_RESET_URL?: string;

  @IsOptional()
  @IsString()
  REFRESH_COOKIE_NAME?: string;

  @IsOptional()
  @IsString()
  CSRF_COOKIE_NAME?: string;

  @IsOptional()
  @IsBooleanString()
  COOKIE_SECURE?: string;

  @IsOptional()
  @IsIn(['lax', 'strict', 'none'])
  COOKIE_SAME_SITE?: string;

  @IsOptional()
  @IsString()
  COOKIE_DOMAIN?: string;

  @IsOptional()
  @IsNumberString()
  EMAIL_VERIFICATION_TOKEN_TTL_HOURS?: string;

  @IsOptional()
  @IsString()
  EMAIL_VERIFICATION_URL?: string;

  @IsOptional()
  @IsIn(['local'])
  STORAGE_DISK?: string;

  @IsOptional()
  @IsString()
  STORAGE_PRIVATE_PATH?: string;

  @IsOptional()
  @IsNumberString()
  MAX_IMAGE_SIZE_MB?: string;

  @IsOptional()
  @IsNumberString()
  MAX_AUDIO_SIZE_MB?: string;

  @IsOptional()
  @IsNumberString()
  IMAGE_MAX_WIDTH?: string;

  @IsOptional()
  @IsNumberString()
  IMAGE_WEBP_QUALITY?: string;

  @IsOptional()
  @IsString()
  EXTERNAL_DICTIONARY_URL?: string;

  @IsOptional()
  @IsString()
  EXTERNAL_TRANSLATION_URL?: string;

  @IsOptional()
  @IsString()
  EXTERNAL_TRANSLATION_API_KEY?: string;

  @IsOptional()
  @IsNumberString()
  EXTERNAL_TIMEOUT_MS?: string;

  @IsOptional()
  @IsNumberString()
  SYSTEM_LOGS_RETENTION_MONTHS?: string;

  @IsOptional()
  @IsNumberString()
  AUDIT_LOGS_RETENTION_MONTHS?: string;

  @IsOptional()
  @IsBooleanString()
  RETENTION_CRON_ENABLED?: string;
}

/**
 * Valida las variables de entorno al iniciar la aplicación.
 * Lanza un error legible con todas las inconsistencias encontradas.
 */
export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const detail = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('\n - ');

    throw new Error(`Configuración de entorno inválida:\n - ${detail}`);
  }

  return validated;
}
