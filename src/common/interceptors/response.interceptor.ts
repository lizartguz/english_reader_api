import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ApiResult } from '@/common/dto/api-result';
import { CommonMessages } from '@/common/constants/messages.constants';

/** Envoltura estándar de respuesta exitosa. */
export interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Normaliza todas las respuestas exitosas al contrato acordado con React Admin
 * y Flutter: `{ success, message, data, meta }`.
 *
 * Los controladores pueden devolver un `ApiResult` para personalizar mensaje y
 * metadatos, o el dato directo cuando no necesiten nada más. Las descargas de
 * archivos se dejan pasar sin envolver.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessResponse<T> | T> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<SuccessResponse<T> | T> {
    return next.handle().pipe(
      map((payload) => {
        // Las respuestas binarias no deben envolverse en JSON.
        if (payload instanceof StreamableFile || Buffer.isBuffer(payload)) {
          return payload;
        }

        if (payload instanceof ApiResult) {
          return {
            success: true as const,
            message: payload.message,
            data: payload.data as T,
            ...(payload.meta ? { meta: payload.meta } : {}),
          };
        }

        return {
          success: true as const,
          message: CommonMessages.Success,
          data: payload,
        };
      }),
    );
  }
}
