import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorCode } from '@/common/constants/error-codes.constants';
import { AuthMessages } from '@/common/constants/messages.constants';
import { parseDurationToSeconds } from '@/common/utils/duration.util';

/**
 * Contenido del access token.
 *
 * Se mantiene mínimo a propósito: identificador de usuario, sesión y roles.
 * Los permisos efectivos no viajan en el token porque se resuelven contra la
 * base en cada solicitud, de modo que un cambio de permisos surta efecto de
 * inmediato sin esperar a que expire el token.
 */
export interface AccessTokenPayload {
  /** Identificador del usuario. */
  sub: string;
  /** Identificador de la sesión lógica. */
  sid: string;
  /** Códigos de rol, útiles para depuración y para los clientes. */
  roles: string[];
  iat?: number;
  exp?: number;
}

/** Access token emitido junto con su vigencia en segundos. */
export interface SignedAccessToken {
  accessToken: string;
  expiresIn: number;
}

/**
 * Emite y valida los access tokens de la API.
 */
@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly accessExpiresIn: string;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.accessSecret = configService.get<string>('security.jwt.accessSecret') as string;
    this.accessExpiresIn = configService.get<string>('security.jwt.accessExpiresIn') as string;
  }

  /** Segundos de vigencia configurados para el access token. */
  get accessTokenTtlSeconds(): number {
    return parseDurationToSeconds(this.accessExpiresIn, 900);
  }

  /**
   * Firma un access token para una sesión concreta.
   *
   * La vigencia nunca supera el fin absoluto de la sesión: si a la sesión le
   * quedan menos minutos que la duración estándar del token, el token se emite
   * con esa vigencia menor para que no sobreviva a su propia sesión.
   */
  signAccessToken(
    userId: string,
    sessionId: string,
    roles: string[],
    sessionExpiresAt: Date,
  ): SignedAccessToken {
    const remainingSeconds = Math.floor((sessionExpiresAt.getTime() - Date.now()) / 1000);
    const expiresIn = Math.max(1, Math.min(this.accessTokenTtlSeconds, remainingSeconds));

    const payload: AccessTokenPayload = { sub: userId, sid: sessionId, roles };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.accessSecret,
      expiresIn,
    });

    return { accessToken, expiresIn };
  }

  /**
   * Valida la firma y la vigencia de un access token.
   * Distingue el token vencido del token manipulado para que el cliente pueda
   * decidir entre renovar la sesión o forzar un nuevo inicio de sesión.
   */
  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      return this.jwtService.verify<AccessTokenPayload>(token, { secret: this.accessSecret });
    } catch (error) {
      const isExpired = (error as Error)?.name === 'TokenExpiredError';

      throw AppException.unauthorized(
        isExpired ? AuthMessages.SessionExpired : AuthMessages.TokenInvalid,
        isExpired ? ErrorCode.TokenExpired : ErrorCode.TokenInvalid,
      );
    }
  }
}
