import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { CookieOptions, Request, Response } from 'express';
import { AppException } from '@/common/exceptions/app.exception';
import { AuthMessages } from '@/common/constants/messages.constants';
import { ErrorCode } from '@/common/constants/error-codes.constants';

/** Cabecera que el panel web debe enviar con el token CSRF. */
export const CSRF_HEADER = 'x-csrf-token';

/** Ruta a la que se limitan las cookies de sesión. */
const COOKIE_PATH = '/api';

/**
 * Gestiona las cookies de sesión del panel administrativo.
 *
 * El refresh token del cliente web viaja en una cookie `HttpOnly`, inaccesible
 * para JavaScript, lo que lo protege frente a XSS. Como esa cookie se envía
 * automáticamente en cada solicitud, se acompaña de un token CSRF con el patrón
 * de doble envío: una cookie legible por el navegador que el cliente debe
 * repetir en la cabecera `X-CSRF-Token`. Un sitio de terceros puede provocar la
 * solicitud, pero no puede leer la cookie para reproducir la cabecera.
 */
@Injectable()
export class AuthCookieService {
  private readonly refreshCookieName: string;
  private readonly csrfCookieName: string;
  private readonly secure: boolean;
  private readonly sameSite: 'lax' | 'strict' | 'none';
  private readonly domain?: string;

  constructor(configService: ConfigService) {
    this.refreshCookieName = configService.get<string>('cookie.refreshName') as string;
    this.csrfCookieName = configService.get<string>('cookie.csrfName') as string;
    this.secure = configService.get<boolean>('cookie.secure') ?? true;
    this.sameSite = configService.get<'lax' | 'strict' | 'none'>('cookie.sameSite') ?? 'none';
    this.domain = configService.get<string>('cookie.domain');
  }

  /** Escribe la cookie del refresh token y la cookie CSRF asociada. */
  issue(response: Response, refreshToken: string, expiresAt: Date): void {
    const maxAge = Math.max(0, expiresAt.getTime() - Date.now());
    const csrfToken = randomBytes(32).toString('hex');

    response.cookie(this.refreshCookieName, refreshToken, this.buildOptions(true, maxAge));
    response.cookie(this.csrfCookieName, csrfToken, this.buildOptions(false, maxAge));
  }

  /** Elimina las cookies de sesión al cerrar sesión o invalidar el acceso. */
  clear(response: Response): void {
    response.clearCookie(this.refreshCookieName, this.buildOptions(true));
    response.clearCookie(this.csrfCookieName, this.buildOptions(false));
  }

  /** Lee el refresh token almacenado en la cookie del panel web. */
  readRefreshToken(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, string> | undefined;
    return cookies?.[this.refreshCookieName];
  }

  /**
   * Verifica el token CSRF de doble envío.
   *
   * Se compara en tiempo constante para no filtrar información por diferencias
   * de temporización.
   */
  assertCsrf(request: Request): void {
    const cookies = request.cookies as Record<string, string> | undefined;
    const cookieToken = cookies?.[this.csrfCookieName];
    const headerValue = request.headers[CSRF_HEADER];
    const headerToken = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!cookieToken || !headerToken || !this.safeCompare(cookieToken, headerToken)) {
      throw AppException.unauthorized(AuthMessages.TokenInvalid, ErrorCode.TokenInvalid);
    }
  }

  /** Compara dos cadenas en tiempo constante. */
  private safeCompare(left: string, right: string): boolean {
    const a = Buffer.from(left);
    const b = Buffer.from(right);

    if (a.length !== b.length) return false;

    return timingSafeEqual(a, b);
  }

  /** Construye las opciones de cookie según la configuración del ambiente. */
  private buildOptions(httpOnly: boolean, maxAge?: number): CookieOptions {
    return {
      httpOnly,
      secure: this.secure,
      sameSite: this.sameSite,
      path: COOKIE_PATH,
      ...(this.domain ? { domain: this.domain } : {}),
      ...(maxAge !== undefined ? { maxAge } : {}),
    };
  }
}
