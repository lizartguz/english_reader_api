import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Expone el cliente de base de datos a toda la aplicación.
 * Es global para que los repositorios no tengan que importarlo módulo por módulo.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
