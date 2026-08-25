import { Global, Module } from '@nestjs/common';
import { SystemLogWriterService } from './application/system-log-writer.service';

/**
 * Registro técnico de excepciones y fallos operativos.
 *
 * Es global porque el filtro de excepciones y los adaptadores de proveedores
 * externos deben poder registrar incidencias desde cualquier punto.
 */
@Global()
@Module({
  providers: [SystemLogWriterService],
  exports: [SystemLogWriterService],
})
export class SystemLogsModule {}
