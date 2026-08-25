import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '@/modules/users/users.module';
import { AuthController } from './presentation/http/auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TokenService } from './application/services/token.service';
import { SessionService } from './application/services/session.service';
import { AuthCookieService } from './application/services/auth-cookie.service';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RefreshSessionUseCase } from './application/use-cases/refresh-session.use-case';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import {
  ResendVerificationUseCase,
  VerifyEmailUseCase,
} from './application/use-cases/verify-email.use-case';
import {
  ForgotPasswordUseCase,
  ResetPasswordUseCase,
} from './application/use-cases/password-recovery.use-case';
import {
  ChangePasswordUseCase,
  GetProfileUseCase,
  LogoutUseCase,
  VerifySessionUseCase,
} from './application/use-cases/session-management.use-case';

/**
 * Autenticación, sesiones, recuperación de acceso y verificación de correo.
 *
 * Exporta `JwtAuthGuard` y `TokenService` porque el guard se registra de forma
 * global en `AppModule` para proteger la API por defecto.
 */
@Module({
  imports: [UsersModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    TokenService,
    SessionService,
    AuthCookieService,
    JwtAuthGuard,
    LoginUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    VerifySessionUseCase,
    GetProfileUseCase,
    RegisterUseCase,
    VerifyEmailUseCase,
    ResendVerificationUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    ChangePasswordUseCase,
  ],
  exports: [JwtAuthGuard, TokenService, SessionService],
})
export class AuthModule {}
