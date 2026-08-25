/**
 * Límites de uso aplicados a los endpoints sensibles de autenticación.
 *
 * Se leen del entorno en tiempo de carga porque los decoradores `@Throttle`
 * se evalúan al declarar la clase y no pueden inyectar `ConfigService`.
 */
const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/** Límite estricto para login, registro, refresh y recuperación de contraseña. */
export const AUTH_THROTTLE = {
  limit: toInt(process.env.THROTTLE_AUTH_LIMIT, 10),
  ttl: toInt(process.env.THROTTLE_AUTH_TTL_SECONDS, 60) * 1000,
} as const;
