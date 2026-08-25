/**
 * Claves que nunca deben persistirse en `system_logs` ni en `audit_logs`.
 * Se comparan en minúsculas y por coincidencia parcial.
 */
const SENSITIVE_KEY_FRAGMENTS = [
  'password',
  'passwd',
  'secret',
  'token',
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'credential',
  'hash',
  'otp',
  'pin',
];

const REDACTED = '[oculto]';
const MAX_DEPTH = 5;
const MAX_STRING_LENGTH = 1000;
const MAX_ARRAY_ITEMS = 50;

/** Indica si el nombre de una clave sugiere información sensible. */
function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

/**
 * Limpia una estructura antes de guardarla como metadata.
 *
 * Reemplaza valores sensibles por un marcador, recorta cadenas y arreglos muy
 * largos y evita estructuras profundas que puedan inflar la base de datos.
 */
export function sanitizeMetadata(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return null;

  if (depth >= MAX_DEPTH) return REDACTED;

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeMetadata(item, depth + 1));
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      result[key] = isSensitiveKey(key) ? REDACTED : sanitizeMetadata(item, depth + 1);
    }

    return result;
  }

  return REDACTED;
}
