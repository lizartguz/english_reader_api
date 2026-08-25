import { Global, Module } from '@nestjs/common';
import { AuditService } from './application/audit.service';
import { AuditLogRepository } from './infrastructure/persistence/audit-log.repository';
import { AuditLogController } from './presentation/http/audit-log.controller';
import { ListAuditLogsUseCase } from './application/use-cases';

/**
 * Auditoría de acciones administrativas sensibles.
 *
 * `AuditService` es global porque cualquier caso de uso del sistema puede
 * necesitar dejar rastro; el controlador de consulta vive en el mismo módulo
 * porque ambos lados (escritura y lectura) pertenecen al mismo agregado.
 */
@Global()
@Module({
  controllers: [AuditLogController],
  providers: [AuditService, AuditLogRepository, ListAuditLogsUseCase],
  exports: [AuditService],
})
export class AuditModule {}
