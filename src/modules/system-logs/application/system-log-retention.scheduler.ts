import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { SystemLogRepository } from '../infrastructure/persistence/system-log.repository';

/**
 * Limpieza programada de `system_logs`, según la política de retención de
 * `07-operacion-y-despliegue.md` (6 meses por defecto, configurable).
 *
 * Solo se ejecuta sobre registros técnicos. La auditoría (`audit_logs`) queda
 * fuera a propósito: la planificación deja pendiente su política final de
 * retención y advierte no eliminarla sin respaldo o aprobación.
 */
@Injectable()
export class SystemLogRetentionScheduler {
  private readonly logger = new Logger(SystemLogRetentionScheduler.name);
  private readonly retentionMonths: number;
  private readonly enabled: boolean;

  constructor(
    private readonly repository: SystemLogRepository,
    configService: ConfigService,
  ) {
    this.retentionMonths = configService.get<number>('retention.systemLogsMonths') ?? 6;
    this.enabled = configService.get<boolean>('retention.cronEnabled') ?? true;
  }

  /** Se ejecuta todos los días a las 3:30 a. m., como en el ejemplo de la planificación. */
  @Cron('30 3 * * *')
  async run(): Promise<void> {
    if (!this.enabled) return;

    const deleted = await this.repository.deleteOlderThanMonths(this.retentionMonths);

    if (deleted > 0) {
      this.logger.log(
        `Se eliminaron ${deleted} registros de system_logs anteriores a ${this.retentionMonths} meses.`,
      );
    }
  }
}
