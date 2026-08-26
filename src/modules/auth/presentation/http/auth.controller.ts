import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiResult } from '@/common/dto/api-result';
import { ApiErrorResponseDto } from '@/common/dto/api-response.dto';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/constants/error-codes.constants';
import { AuthMessages, CommonMessages } from '@/common/constants/messages.constants';
import { ClientType } from '@/common/enums/client-type.enum';
import { extractRequestContext } from '@/common/utils/request-context.util';
import { AUTH_THROTTLE } from '@/common/constants/throttle.constants';
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from '@/common/types/authenticated-user.type';
import { AuthCookieService } from '../../application/services/auth-cookie.service';
import { LoginUseCase, type LoginResult } from '../../application/use-cases/login.use-case';
import { RefreshSessionUseCase } from '../../application/use-cases/refresh-session.use-case';
import { RegisterUseCase } from '../../application/use-cases/register.use-case';
import {
  ResendVerificationUseCase,
  VerifyEmailUseCase,
} from '../../application/use-cases/verify-email.use-case';
import {
  ForgotPasswordUseCase,
  ResetPasswordUseCase,
} from '../../application/use-cases/password-recovery.use-case';
import {
  ChangePasswordUseCase,
  GetProfileUseCase,
  LogoutUseCase,
  VerifySessionUseCase,
} from '../../application/use-cases/session-management.use-case';
import { LoginDto } from '../../application/dto/login.dto';
import { RegisterDto } from '../../application/dto/register.dto';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LogoutDto,
  RefreshSessionDto,
  ResendVerificationDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from '../../application/dto/token.dto';
import {
  AuthSessionResponse,
  AuthenticatedUserResponse,
  SessionStatusResponse,
} from '../../application/dto/auth-response.dto';

/**
 * Endpoints de autenticación consumidos por React Admin y por la aplicación
 * Flutter.
 *
 * El refresh token se entrega según el cliente: en cookie `HttpOnly` para el
 * panel web y en el cuerpo de la respuesta para el móvil, que lo guarda en el
 * almacenamiento seguro del dispositivo.
 */
@ApiTags('Autenticación')
@ApiResponse({ status: 400, description: 'Datos inválidos.', type: ApiErrorResponseDto })
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly verifySessionUseCase: VerifySessionUseCase,
    private readonly getProfileUseCase: GetProfileUseCase,
    private readonly registerUseCase: RegisterUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly resendVerificationUseCase: ResendVerificationUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly cookieService: AuthCookieService,
  ) {}

  /** Registra un usuario cliente y envía el correo de confirmación. */
  @Public()
  @Throttle({ default: AUTH_THROTTLE })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar un usuario cliente',
    description:
      'Crea la cuenta en estado `pending_verification` con rol CLIENT y envía el enlace de confirmación.',
  })
  async register(
    @Body() dto: RegisterDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<null>> {
    await this.registerUseCase.execute(dto, extractRequestContext(request));

    return ApiResult.of(
      null,
      'Tu cuenta fue creada. Revisa tu correo para confirmarla y poder iniciar sesión.',
    );
  }

  /** Confirma el correo de una cuenta recién registrada. */
  @Public()
  @Throttle({ default: AUTH_THROTTLE })
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar el correo de la cuenta' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<ApiResult<null>> {
    await this.verifyEmailUseCase.execute(dto);

    return ApiResult.of(null, 'Tu correo fue confirmado. Ya puedes iniciar sesión.');
  }

  /** Reenvía el correo de confirmación de la cuenta. */
  @Public()
  @Throttle({ default: AUTH_THROTTLE })
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reenviar el correo de confirmación',
    description: 'La respuesta es siempre la misma para no revelar si el correo está registrado.',
  })
  async resendVerification(
    @Body() dto: ResendVerificationDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<null>> {
    await this.resendVerificationUseCase.execute(dto, extractRequestContext(request));

    return ApiResult.of(
      null,
      'Si la cuenta existe y está pendiente de confirmación, recibirás un nuevo correo.',
    );
  }

  /** Valida credenciales y emite una sesión. */
  @Public()
  @Throttle({ default: AUTH_THROTTLE })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, type: AuthSessionResponse })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas.', type: ApiErrorResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResult<AuthSessionResponse>> {
    const result = await this.loginUseCase.execute(dto, extractRequestContext(request));

    return this.deliverSession(result, dto.clientType, response, AuthMessages.LoginSuccess);
  }

  /** Renueva la sesión rotando el refresh token. */
  @Public()
  @Throttle({ default: AUTH_THROTTLE })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renovar la sesión',
    description:
      'Los clientes web deben enviar la cabecera `X-CSRF-Token` con el valor de la cookie CSRF.',
  })
  @ApiResponse({ status: 200, type: AuthSessionResponse })
  async refresh(
    @Body() dto: RefreshSessionDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResult<AuthSessionResponse>> {
    const token = this.resolveRefreshToken(dto.clientType, dto.refreshToken, request, true);

    const result = await this.refreshSessionUseCase.execute(
      token,
      dto,
      extractRequestContext(request),
    );

    return this.deliverSession(result, dto.clientType, response, AuthMessages.RefreshSuccess);
  }

  /** Cierra la sesión actual e invalida su refresh token. */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión' })
  async logout(
    @Body() dto: LogoutDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResult<null>> {
    const token =
      dto.refreshToken ??
      (dto.clientType === ClientType.Web
        ? this.cookieService.readRefreshToken(request)
        : undefined);

    await this.logoutUseCase.execute(token, request.user, extractRequestContext(request));

    this.cookieService.clear(response);

    return ApiResult.of(null, AuthMessages.LogoutSuccess);
  }

  /** Indica si la sesión sigue vigente. La app la consulta al arrancar. */
  @Get('verify-session')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verificar la sesión activa',
    description:
      'Responde 401 con el código `session_invalidated` cuando la sesión fue cerrada desde otro dispositivo.',
  })
  @ApiResponse({ status: 200, type: SessionStatusResponse })
  async verifySession(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ApiResult<SessionStatusResponse>> {
    const status = await this.verifySessionUseCase.execute(user);

    return ApiResult.of(status, AuthMessages.SessionValid);
  }

  /** Devuelve el perfil, roles y permisos del usuario autenticado. */
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar el perfil autenticado' })
  @ApiResponse({ status: 200, type: AuthenticatedUserResponse })
  async me(@CurrentUser('id') userId: string): Promise<ApiResult<AuthenticatedUserResponse>> {
    const profile = await this.getProfileUseCase.execute(userId);

    return ApiResult.of(profile, AuthMessages.ProfileRetrieved);
  }

  /** Inicia el flujo de recuperación de contraseña. */
  @Public()
  @Throttle({ default: AUTH_THROTTLE })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicitar recuperación de contraseña',
    description: 'La respuesta es genérica para no revelar si el correo está registrado.',
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<null>> {
    await this.forgotPasswordUseCase.execute(dto, extractRequestContext(request));

    return ApiResult.of(null, AuthMessages.PasswordResetRequested);
  }

  /** Define una contraseña nueva a partir del token recibido por correo. */
  @Public()
  @Throttle({ default: AUTH_THROTTLE })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restablecer la contraseña' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResult<null>> {
    await this.resetPasswordUseCase.execute(dto, extractRequestContext(request));

    // Todas las sesiones quedaron revocadas: la cookie del navegador ya no sirve.
    this.cookieService.clear(response);

    return ApiResult.of(null, AuthMessages.PasswordResetCompleted);
  }

  /** Cambia la contraseña de la propia cuenta. */
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar la contraseña propia' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<null>> {
    await this.changePasswordUseCase.execute(user, dto, extractRequestContext(request));

    return ApiResult.of(null, AuthMessages.PasswordChanged);
  }

  /**
   * Entrega la sesión según el tipo de cliente.
   *
   * En web el refresh token se escribe en cookie `HttpOnly` y se omite del
   * cuerpo, de modo que JavaScript nunca pueda leerlo. En móvil se devuelve en
   * la respuesta porque el dispositivo lo guarda en almacenamiento seguro.
   */
  private deliverSession(
    result: LoginResult,
    clientType: ClientType,
    response: Response,
    message: string,
  ): ApiResult<AuthSessionResponse> {
    if (clientType === ClientType.Web) {
      this.cookieService.issue(response, result.refreshToken, result.refreshExpiresAt);

      return ApiResult.of(result.session, message);
    }

    return ApiResult.of({ ...result.session, refreshToken: result.refreshToken }, message);
  }

  /**
   * Obtiene el refresh token del transporte que corresponda y valida el token
   * CSRF cuando la solicitud proviene del panel web.
   */
  private resolveRefreshToken(
    clientType: ClientType,
    bodyToken: string | undefined,
    request: AuthenticatedRequest,
    requireCsrf: boolean,
  ): string {
    if (clientType === ClientType.Web) {
      const cookieToken = this.cookieService.readRefreshToken(request);

      // Primero se comprueba si existe sesión: sin cookie no hay nada que
      // proteger, y responder «CSRF inválido» a una visita anónima confundiría
      // al cliente sobre la causa real.
      if (!cookieToken) {
        throw AppException.unauthorized(AuthMessages.SessionExpired, ErrorCode.SessionExpired);
      }

      if (requireCsrf) this.cookieService.assertCsrf(request);

      return cookieToken;
    }

    if (!bodyToken) {
      throw AppException.validation(CommonMessages.ValidationFailed, [
        { field: 'refreshToken', message: 'El refresh token es obligatorio.' },
      ]);
    }

    return bodyToken;
  }
}
