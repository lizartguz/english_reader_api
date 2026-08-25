import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PrismaService, PrismaTransaction } from '@/database/prisma.service';
import { TokenHasherService } from '@/common/security/token-hasher.service';
import { addSeconds, parseDurationToSeconds } from '@/common/utils/duration.util';
import type { RequestContext } from '@/common/utils/request-context.util';
import type { DeviceInfoDto } from '@/modules/auth/application/dto/device-info.dto';

/** Motivos por los que una sesión puede invalidarse. */
export enum SessionRevokeReason {
  Logout = 'logout',
  Rotated = 'rotated',
  NewDeviceLogin = 'new_device_login',
  PasswordChanged = 'password_changed',
  TokenReuseDetected = 'token_reuse_detected',
  AdminAction = 'admin_action',
}

/** Sesión recién creada o rotada. */
export interface IssuedSession {
  sessionId: string;
  refreshToken: string;
  refreshTokenId: string;
  expiresAt: Date;
  sessionExpiresAt: Date;
}

/**
 * Gestiona el ciclo de vida de los refresh tokens y de las sesiones.
 *
 * El token nunca se almacena en claro: solo se guarda su hash. La rotación deja
 * rastro mediante `replacedByTokenId`, lo que permite detectar reutilización de
 * un token ya consumido y cerrar la sesión completa ante esa señal.
 */
@Injectable()
export class SessionService {
  private readonly refreshTtlSeconds: number;
  private readonly adminSessionMaxHours: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenHasher: TokenHasherService,
    configService: ConfigService,
  ) {
    this.refreshTtlSeconds = parseDurationToSeconds(
      configService.get<string>('security.jwt.refreshExpiresIn') as string,
      2_592_000,
    );
    this.adminSessionMaxHours = configService.get<number>('security.adminSessionMaxHours') ?? 8;
  }

  /**
   * Calcula el fin absoluto de una sesión.
   *
   * Las cuentas administrativas tienen un tope de ocho horas desde el inicio de
   * sesión, según la planificación de seguridad. Las cuentas cliente usan la
   * vigencia estándar del refresh token para no forzar reautenticaciones
   * constantes en el móvil.
   */
  calculateSessionExpiry(isAdministrative: boolean, from: Date = new Date()): Date {
    return isAdministrative
      ? addSeconds(from, this.adminSessionMaxHours * 3600)
      : addSeconds(from, this.refreshTtlSeconds);
  }

  /** Vigencia estándar del refresh token, en segundos. */
  get refreshTokenTtlSeconds(): number {
    return this.refreshTtlSeconds;
  }

  /**
   * Crea una sesión nueva con su primer refresh token.
   * El vencimiento del token nunca supera el fin absoluto de la sesión.
   */
  async createSession(
    userId: string,
    sessionExpiresAt: Date,
    device: DeviceInfoDto | undefined,
    context: RequestContext,
    tx?: PrismaTransaction,
  ): Promise<IssuedSession> {
    const client = tx ?? this.prisma;
    const sessionId = randomUUID();
    const refreshToken = this.tokenHasher.generate();
    const expiresAt = this.capToSession(
      addSeconds(new Date(), this.refreshTtlSeconds),
      sessionExpiresAt,
    );

    const created = await client.refreshToken.create({
      data: {
        userId,
        sessionId,
        tokenHash: this.tokenHasher.hash(refreshToken),
        expiresAt,
        sessionExpiresAt,
        deviceIdentifier: device?.deviceId ?? null,
        platform: device?.platform ?? null,
        appVersion: device?.appVersion ?? null,
        deviceName: device?.deviceName ?? null,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      },
      select: { id: true },
    });

    return {
      sessionId,
      refreshToken,
      refreshTokenId: created.id,
      expiresAt,
      sessionExpiresAt,
    };
  }

  /**
   * Emite un refresh token nuevo dentro de la misma sesión y marca el anterior
   * como reemplazado. Mantiene el `sessionExpiresAt` original para que la
   * rotación no extienda el tope absoluto de la sesión.
   */
  async rotate(
    currentTokenId: string,
    userId: string,
    sessionId: string,
    sessionExpiresAt: Date,
    device: DeviceInfoDto | undefined,
    context: RequestContext,
    tx: PrismaTransaction,
  ): Promise<IssuedSession> {
    const refreshToken = this.tokenHasher.generate();
    const expiresAt = this.capToSession(
      addSeconds(new Date(), this.refreshTtlSeconds),
      sessionExpiresAt,
    );

    const created = await tx.refreshToken.create({
      data: {
        userId,
        sessionId,
        tokenHash: this.tokenHasher.hash(refreshToken),
        expiresAt,
        sessionExpiresAt,
        deviceIdentifier: device?.deviceId ?? null,
        platform: device?.platform ?? null,
        appVersion: device?.appVersion ?? null,
        deviceName: device?.deviceName ?? null,
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
      },
      select: { id: true },
    });

    await tx.refreshToken.update({
      where: { id: currentTokenId },
      data: {
        revokedAt: new Date(),
        revokedReason: SessionRevokeReason.Rotated,
        replacedByTokenId: created.id,
      },
    });

    return {
      sessionId,
      refreshToken,
      refreshTokenId: created.id,
      expiresAt,
      sessionExpiresAt,
    };
  }

  /** Busca un refresh token por su valor en claro, sin filtrar por estado. */
  findByToken(token: string, tx?: PrismaTransaction) {
    return (tx ?? this.prisma).refreshToken.findUnique({
      where: { tokenHash: this.tokenHasher.hash(token) },
      select: {
        id: true,
        userId: true,
        sessionId: true,
        expiresAt: true,
        sessionExpiresAt: true,
        revokedAt: true,
      },
    });
  }

  /** Indica si una sesión sigue teniendo al menos un token vigente. */
  async findActiveSession(sessionId: string): Promise<{ sessionExpiresAt: Date } | null> {
    return this.prisma.refreshToken.findFirst({
      where: { sessionId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { sessionExpiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Invalida todos los tokens vigentes de una sesión. */
  async revokeSession(
    sessionId: string,
    reason: SessionRevokeReason,
    tx?: PrismaTransaction,
  ): Promise<void> {
    await (tx ?? this.prisma).refreshToken.updateMany({
      where: { sessionId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  /**
   * Invalida todas las sesiones vigentes de un usuario.
   *
   * Es el mecanismo que aplica la política de un solo dispositivo por usuario
   * cliente y el cierre de sesiones tras un cambio de contraseña.
   */
  async revokeAllUserSessions(
    userId: string,
    reason: SessionRevokeReason,
    tx?: PrismaTransaction,
    exceptSessionId?: string,
  ): Promise<void> {
    await (tx ?? this.prisma).refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId ? { sessionId: { not: exceptSessionId } } : {}),
      },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  /** Evita que un refresh token sobreviva al fin absoluto de su sesión. */
  private capToSession(tokenExpiresAt: Date, sessionExpiresAt: Date): Date {
    return tokenExpiresAt.getTime() > sessionExpiresAt.getTime()
      ? sessionExpiresAt
      : tokenExpiresAt;
  }
}
