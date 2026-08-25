import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { SystemLogLevel } from '@/common/enums/domain.enums';
import { SystemLogSource } from '@/common/constants/system-log-sources.constants';
import { ErrorCode } from '@/common/constants/error-codes.constants';
import { sanitizeMetadata } from '@/common/utils/sanitize.util';

/** Datos aceptados para registrar un evento técnico. */
export interface WriteSystemLogInput {
  level: SystemLogLevel;
  source: SystemLogSource;
  message: string;
  exceptionName?: string | null;
  errorCode?: ErrorCode | string | null;
  requestMethod?: string | null;
  requestPath?: string | null;
  actorUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
}

/**
 * Registra fallos técnicos y excepciones capturadas en `system_logs`.
 *
 * Es deliberadamente tolerante a fallos: si no puede escribir el registro, no
 * propaga el error, porque un problema de trazabilidad nunca debe romper la
 * operación que el usuario está ejecutando.
 */
@Injectable()
export class SystemLogWriterService {
  private readonly logger = new Logger(SystemLogWriterService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Guarda un registro técnico sanitizado. Nunca lanza excepciones. */
  async write(input: WriteSystemLogInput): Promise<void> {
    try {
      await this.prisma.systemLog.create({
        data: {
          level: input.level,
          source: input.source,
          message: input.message.slice(0, 500),
          exceptionName: input.exceptionName?.slice(0, 150) ?? null,
          errorCode: input.errorCode?.slice(0, 100) ?? null,
          requestMethod: input.requestMethod?.slice(0, 10) ?? null,
          requestPath: input.requestPath?.slice(0, 500) ?? null,
          actorUserId: input.actorUserId ?? null,
          ipAddress: input.ipAddress?.slice(0, 45) ?? null,
          userAgent: input.userAgent?.slice(0, 500) ?? null,
          metadata: (sanitizeMetadata(input.metadata ?? null) ?? undefined) as never,
        },
      });
    } catch (error) {
      // Último recurso: dejar rastro en el log de consola sin interrumpir el flujo.
      this.logger.error(`No se pudo registrar en system_logs: ${(error as Error).message}`);
    }
  }

  /** Atajo para registrar un error de proveedor externo. */
  async writeProviderFailure(
    source: SystemLogSource,
    message: string,
    metadata?: unknown,
  ): Promise<void> {
    await this.write({
      level: SystemLogLevel.error,
      source,
      message,
      errorCode: ErrorCode.ExternalProviderError,
      metadata,
    });
  }
}
