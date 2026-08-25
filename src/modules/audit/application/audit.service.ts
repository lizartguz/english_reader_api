import { Injectable, Logger } from '@nestjs/common';
import { PrismaService, PrismaTransaction } from '@/database/prisma.service';
import { AuditAction, AuditEntityType } from '@/common/constants/audit-actions.constants';
import { sanitizeMetadata } from '@/common/utils/sanitize.util';
import type { RequestContext } from '@/common/utils/request-context.util';

/** Datos necesarios para registrar una acción auditable. */
export interface RecordAuditInput {
  actorUserId?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  summary: string;
  metadata?: unknown;
  context?: RequestContext;
}

/**
 * Registra acciones administrativas sensibles en `audit_logs`.
 *
 * A diferencia de `system_logs`, aquí se guardan hechos de negocio: quién hizo
 * qué, sobre qué entidad y cuándo. Nunca debe almacenar contraseñas, tokens ni
 * secretos; la metadata pasa siempre por un sanitizador.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Guarda el registro de auditoría.
   *
   * Cuando se recibe una transacción, la auditoría se escribe dentro de ella
   * para que la acción y su rastro se confirmen o se reviertan juntos.
   */
  async record(input: RecordAuditInput, tx?: PrismaTransaction): Promise<void> {
    const client = tx ?? this.prisma;

    const data = {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary.slice(0, 255),
      metadata: (sanitizeMetadata(input.metadata ?? null) ?? undefined) as never,
      ipAddress: input.context?.ipAddress?.slice(0, 45) ?? null,
      userAgent: input.context?.userAgent?.slice(0, 500) ?? null,
    };

    if (tx) {
      // Dentro de una transacción el fallo debe propagarse para revertir todo.
      await client.auditLog.create({ data });
      return;
    }

    try {
      await client.auditLog.create({ data });
    } catch (error) {
      this.logger.error(`No se pudo registrar en audit_logs: ${(error as Error).message}`);
    }
  }
}
