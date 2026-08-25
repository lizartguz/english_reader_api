import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Response } from 'express';
import { AppException, AppErrorDetail } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/constants/error-codes.constants';
import { CommonMessages } from '@/common/constants/messages.constants';
import { SystemLogLevel } from '@/common/enums/domain.enums';
import { SystemLogSource } from '@/common/constants/system-log-sources.constants';
import { SystemLogWriterService } from '@/modules/system-logs/application/system-log-writer.service';
import { extractRequestContext } from '@/common/utils/request-context.util';
import type { AuthenticatedRequest } from '@/common/types/authenticated-user.type';

/** Envoltura estándar de respuesta con error. */
interface ErrorResponseBody {
  success: false;
  message: string;
  code: ErrorCode;
  errors: AppErrorDetail[];
}

/** Códigos de error conocidos de Prisma que sí tienen una respuesta de negocio. */
const PRISMA_UNIQUE_CONSTRAINT = 'P2002';
const PRISMA_RECORD_NOT_FOUND = 'P2025';
const PRISMA_FOREIGN_KEY = 'P2003';

/** A partir de este estado, el fallo se considera del servidor y se registra. */
const SERVER_ERROR_THRESHOLD: number = HttpStatus.INTERNAL_SERVER_ERROR;
const TOO_MANY_REQUESTS: number = HttpStatus.TOO_MANY_REQUESTS;

/**
 * Código estable asociado a cada estado HTTP conocido. Los estados no listados
 * se tratan como error interno.
 */
const ERROR_CODE_BY_STATUS: Readonly<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.ValidationFailed,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.Unauthenticated,
  [HttpStatus.FORBIDDEN]: ErrorCode.Forbidden,
  [HttpStatus.NOT_FOUND]: ErrorCode.NotFound,
  [HttpStatus.CONFLICT]: ErrorCode.Conflict,
  [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCode.BusinessRule,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCode.PayloadTooLarge,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RateLimited,
  [HttpStatus.BAD_GATEWAY]: ErrorCode.ExternalProviderError,
  [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.ExternalProviderUnavailable,
};

/**
 * Traduce cualquier excepción a la respuesta estándar de la API.
 *
 * Reglas aplicadas:
 * - El cliente siempre recibe un mensaje amigable en español y un código estable.
 * - Nunca se exponen stack traces, SQL, nombres internos ni secretos.
 * - Los fallos operativos relevantes se registran en `system_logs`; los errores
 *   esperados (validación, credenciales, permisos, 404) no ensucian esa tabla.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly systemLogWriter: SystemLogWriterService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AuthenticatedRequest>();

    const { status, body } = this.resolveException(exception);

    void this.registerIfRelevant(exception, status, body, request);

    response.status(status).json(body);
  }

  /** Determina el estado HTTP y el cuerpo de respuesta según el tipo de excepción. */
  private resolveException(exception: unknown): { status: number; body: ErrorResponseBody } {
    if (exception instanceof AppException) {
      const payload = exception.getResponse() as {
        message: string;
        code: ErrorCode;
        errors: AppErrorDetail[];
      };

      return {
        status: exception.getStatus(),
        body: {
          success: false,
          message: payload.message,
          code: payload.code,
          errors: payload.errors ?? [],
        },
      };
    }

    if (exception instanceof ThrottlerException) {
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        body: {
          success: false,
          message: CommonMessages.RateLimited,
          code: ErrorCode.RateLimited,
          errors: [],
        },
      };
    }

    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    const prismaMapped = this.fromPrismaError(exception);
    if (prismaMapped) return prismaMapped;

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        success: false,
        message: CommonMessages.InternalError,
        code: ErrorCode.InternalError,
        errors: [],
      },
    };
  }

  /** Convierte las excepciones nativas de Nest al contrato de la API. */
  private fromHttpException(exception: HttpException): {
    status: number;
    body: ErrorResponseBody;
  } {
    const status = exception.getStatus();
    const raw = exception.getResponse();

    let message: string = CommonMessages.InternalError;
    let errors: AppErrorDetail[] = [];

    if (typeof raw === 'string') {
      message = raw;
    } else if (raw && typeof raw === 'object') {
      const payload = raw as { message?: string | string[] };

      if (Array.isArray(payload.message)) {
        errors = payload.message.map((item) => ({ message: item }));
        message = CommonMessages.ValidationFailed;
      } else if (typeof payload.message === 'string') {
        message = payload.message;
      }
    }

    return {
      status,
      body: {
        success: false,
        message: status >= SERVER_ERROR_THRESHOLD ? CommonMessages.InternalError : message,
        code: this.codeForStatus(status),
        errors,
      },
    };
  }

  /**
   * Traduce los errores conocidos de Prisma a respuestas de negocio.
   * Los errores desconocidos se dejan caer al manejador genérico de 500.
   */
  private fromPrismaError(exception: unknown): { status: number; body: ErrorResponseBody } | null {
    const code = (exception as { code?: unknown })?.code;
    if (typeof code !== 'string') return null;

    if (code === PRISMA_UNIQUE_CONSTRAINT) {
      return {
        status: HttpStatus.CONFLICT,
        body: {
          success: false,
          message: 'Ya existe un registro con esos datos.',
          code: ErrorCode.Conflict,
          errors: [],
        },
      };
    }

    if (code === PRISMA_RECORD_NOT_FOUND) {
      return {
        status: HttpStatus.NOT_FOUND,
        body: {
          success: false,
          message: CommonMessages.NotFound,
          code: ErrorCode.NotFound,
          errors: [],
        },
      };
    }

    if (code === PRISMA_FOREIGN_KEY) {
      return {
        status: HttpStatus.CONFLICT,
        body: {
          success: false,
          message: 'La operación afecta registros relacionados y no puede completarse.',
          code: ErrorCode.Conflict,
          errors: [],
        },
      };
    }

    return null;
  }

  /** Asocia un código de error estable a cada estado HTTP conocido. */
  private codeForStatus(status: number): ErrorCode {
    return ERROR_CODE_BY_STATUS[status] ?? ErrorCode.InternalError;
  }

  /**
   * Decide si el fallo merece quedar registrado en `system_logs`.
   *
   * Se registran errores internos, fallos de integración y abusos detectados.
   * Las validaciones, credenciales inválidas, permisos y recursos inexistentes
   * son resultados esperados y no se persisten.
   */
  private async registerIfRelevant(
    exception: unknown,
    status: number,
    body: ErrorResponseBody,
    request: AuthenticatedRequest,
  ): Promise<void> {
    const isServerError = status >= SERVER_ERROR_THRESHOLD;
    const isThrottled = status === TOO_MANY_REQUESTS;

    if (!isServerError && !isThrottled) return;

    const context = extractRequestContext(request);
    const error = exception instanceof Error ? exception : undefined;

    if (isServerError) {
      // El detalle técnico completo queda solo en el log del servidor.
      this.logger.error(
        `${context.method ?? ''} ${context.path ?? ''} -> ${error?.message ?? 'error desconocido'}`,
        error?.stack,
      );
    }

    await this.systemLogWriter.write({
      level: isServerError ? SystemLogLevel.error : SystemLogLevel.warning,
      source: isServerError ? SystemLogSource.Http : SystemLogSource.Auth,
      message: isServerError
        ? (error?.message ?? 'Error no controlado en la API.')
        : 'Se alcanzó el límite de solicitudes permitidas.',
      exceptionName: error?.name ?? null,
      errorCode: body.code,
      requestMethod: context.method,
      requestPath: context.path,
      actorUserId: request.user?.id ?? null,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { statusCode: status },
    });
  }
}
