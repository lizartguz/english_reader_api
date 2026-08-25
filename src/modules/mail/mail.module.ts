import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * Provee el envío de correos transaccionales a toda la aplicación.
 * Es global porque varios módulos (auth, usuarios) necesitan notificar.
 */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
