import type { Request } from 'express';
import { UserStatus } from '@/common/enums/domain.enums';

/**
 * Identidad resuelta a partir del access token y adjuntada a la solicitud.
 * Contiene solo lo necesario para autorizar; nunca hashes ni datos sensibles.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  /** Códigos de rol, por ejemplo `SUPER_ADMIN`. */
  roles: string[];
  /** Códigos de permiso efectivos, por ejemplo `stories.update`. */
  permissions: string[];
  /** Sesión lógica que agrupa todas las rotaciones de refresh token. */
  sessionId: string;
  /** Momento en que la sesión expira de forma absoluta. */
  sessionExpiresAt: Date;
}

/** Solicitud HTTP con la identidad ya resuelta por el guard de autenticación. */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
