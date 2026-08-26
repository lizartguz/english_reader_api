import type { TransformFnParams } from 'class-transformer';

/**
 * Normalizadores reutilizables para DTOs.
 *
 * Se declaran una sola vez porque `class-transformer` entrega el valor sin
 * tipar; centralizarlos evita repetir la comprobación en cada campo y mantiene
 * consistente la limpieza de la entrada.
 */

/** Recorta los espacios de un texto y deja intacto cualquier otro tipo. */
export function trimText({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/** Recorta y normaliza un correo a minúsculas para que la búsqueda sea estable. */
export function normalizeEmail({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

/** Recorta y normaliza un código a mayúsculas (niveles, géneros, roles). */
export function normalizeUpperCode({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

/**
 * Normaliza un parámetro de consulta que admite uno o varios valores.
 *
 * Express entrega un string cuando el parámetro aparece una sola vez
 * (`?rol=ADMIN`) y un arreglo cuando se repite (`?rol=ADMIN&rol=SUPER_ADMIN`).
 * Envolver siempre en arreglo evita que cada filtro tenga que distinguirlo.
 */
export function toArray({ value }: TransformFnParams): unknown {
  if (value === undefined || value === null) return value;
  return Array.isArray(value) ? value : [value];
}
