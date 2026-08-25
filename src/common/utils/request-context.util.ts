import type { Request } from 'express';

/** Datos de contexto de la solicitud que se guardan en auditoría y logs. */
export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  path?: string;
}

/** Longitud máxima de `user_agent` en base de datos. */
const USER_AGENT_MAX_LENGTH = 500;

/**
 * Extrae IP y user agent de la solicitud para trazabilidad.
 * Los valores se recortan al tamaño de columna para evitar fallos de inserción.
 */
export function extractRequestContext(request: Request | undefined): RequestContext {
  if (!request) return {};

  const forwarded = request.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim();
  const userAgent = request.headers['user-agent'];

  return {
    ipAddress: (forwardedIp || request.ip || request.socket?.remoteAddress)?.slice(0, 45),
    userAgent: userAgent?.slice(0, USER_AGENT_MAX_LENGTH),
    method: request.method,
    path: request.originalUrl?.slice(0, 500) ?? request.url?.slice(0, 500),
  };
}
