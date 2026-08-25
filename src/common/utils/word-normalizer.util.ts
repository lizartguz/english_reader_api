/**
 * Normaliza una palabra para búsqueda y caché del diccionario.
 *
 * Reglas definidas en `docs/planning/04-logica-negocio.md`:
 * - convierte a minúsculas
 * - elimina espacios sobrantes
 * - elimina puntuación externa simple
 * - conserva los apóstrofes internos, porque distinguen palabras reales
 *   como `don't` o `it's`
 *
 * Los casos avanzados (plurales, conjugaciones y contracciones expandidas) se
 * resolverán en una etapa posterior según la planificación.
 */
export function normalizeWord(rawWord: string): string {
  return rawWord
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/[^\p{L}\p{N}]+$/u, '')
    .replace(/\s+/g, ' ');
}

/**
 * Indica si una palabra normalizada es consultable.
 * Evita enviar cadenas vacías o basura a los proveedores externos.
 */
export function isLookupableWord(normalized: string): boolean {
  if (normalized.length === 0 || normalized.length > 150) return false;
  return /^[\p{L}][\p{L}\p{N}'\-\s]*$/u.test(normalized);
}
