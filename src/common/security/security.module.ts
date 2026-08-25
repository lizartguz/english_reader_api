import { Global, Module } from '@nestjs/common';
import { PasswordHasherService } from './password-hasher.service';
import { TokenHasherService } from './token-hasher.service';

/**
 * Servicios criptográficos compartidos por autenticación, usuarios y seeders.
 * Es global porque varios módulos necesitan hashear contraseñas o tokens.
 */
@Global()
@Module({
  providers: [PasswordHasherService, TokenHasherService],
  exports: [PasswordHasherService, TokenHasherService],
})
export class SecurityModule {}
