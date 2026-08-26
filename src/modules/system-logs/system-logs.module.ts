import { Global, Module } from '@nestjs/common';
import { SystemLogWriterService } from './application/system-log-writer.service';
import { ListSystemLogsUseCase } from './application/use-cases/list-system-logs.use-case';
import { SystemLogRepository } from './infrastructure/persistence/system-log.repository';
import { SystemLogsController } from './presentation/http/system-logs.controller';

/**
 * Registro técnico de excepciones y fallos operativos.
 *
 * Es global porque el filtro de excepciones y los adaptadores de proveedores
 * externos deben poder registrar incidencias desde cualquier punto. La
 * consulta administrativa (`SystemLogsController`) vive en el mismo módulo
 * porque escritura y lectura pertenecen al mismo agregado, igual que auditoría.
 */
@Global()
@Module({
  controllers: [SystemLogsController],
  providers: [SystemLogWriterService, SystemLogRepository, ListSystemLogsUseCase],
  exports: [SystemLogWriterService],
})
export class SystemLogsModule {}
