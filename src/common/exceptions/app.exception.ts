import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@/common/constants/error-codes.constants';
import { CommonMessages } from '@/common/constants/messages.constants';

/** Detalle de un error de validación o de regla de negocio. */
export interface AppErrorDetail {
  field?: string;
  message: string;
}

/** Cuerpo normalizado que viaja dentro de la excepción. */
export interface AppExceptionBody {
  message: string;
  code: ErrorCode;
  errors: AppErrorDetail[];
}

/**
 * Excepción base de la aplicación.
 *
 * Encapsula un mensaje amigable en español, un código estable que los clientes
 * pueden interpretar y, opcionalmente, el detalle por campo. Nunca debe
 * construirse con texto técnico ni información sensible.
 */
export class AppException extends HttpException {
  constructor(message: string, code: ErrorCode, status: HttpStatus, errors: AppErrorDetail[] = []) {
    const body: AppExceptionBody = { message, code, errors };
    super(body, status);
  }

  /** 404: el recurso solicitado no existe o fue eliminado. */
  static notFound(message: string = CommonMessages.NotFound): AppException {
    return new AppException(message, ErrorCode.NotFound, HttpStatus.NOT_FOUND);
  }

  /** 403: el usuario está autenticado pero no tiene permisos suficientes. */
  static forbidden(message: string = CommonMessages.Forbidden): AppException {
    return new AppException(message, ErrorCode.Forbidden, HttpStatus.FORBIDDEN);
  }

  /** 401: falta autenticación o la sesión dejó de ser válida. */
  static unauthorized(
    message: string = CommonMessages.Unauthenticated,
    code: ErrorCode = ErrorCode.Unauthenticated,
  ): AppException {
    return new AppException(message, code, HttpStatus.UNAUTHORIZED);
  }

  /** 409: la operación choca con el estado actual del recurso. */
  static conflict(
    message: string = CommonMessages.Conflict,
    errors: AppErrorDetail[] = [],
  ): AppException {
    return new AppException(message, ErrorCode.Conflict, HttpStatus.CONFLICT, errors);
  }

  /** 422: los datos son sintácticamente válidos pero rompen una regla de negocio. */
  static businessRule(message: string, errors: AppErrorDetail[] = []): AppException {
    return new AppException(
      message,
      ErrorCode.BusinessRule,
      HttpStatus.UNPROCESSABLE_ENTITY,
      errors,
    );
  }

  /** 400: parámetros o cuerpo de la solicitud inválidos. */
  static validation(
    message: string = CommonMessages.ValidationFailed,
    errors: AppErrorDetail[] = [],
  ): AppException {
    return new AppException(message, ErrorCode.ValidationFailed, HttpStatus.BAD_REQUEST, errors);
  }

  /** 502: el proveedor externo respondió con un error. */
  static externalProvider(message: string = CommonMessages.ExternalUnavailable): AppException {
    return new AppException(message, ErrorCode.ExternalProviderError, HttpStatus.BAD_GATEWAY);
  }

  /** 503: el proveedor externo no está disponible o agotó el tiempo de espera. */
  static externalUnavailable(message: string = CommonMessages.ExternalUnavailable): AppException {
    return new AppException(
      message,
      ErrorCode.ExternalProviderUnavailable,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
