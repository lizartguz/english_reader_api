import slugify from 'slugify';

/** Genera un slug estable a partir de un título de historia. */
export function buildSlug(value: string): string {
  return slugify(value, { lower: true, strict: true, trim: true }).slice(0, 200);
}

/**
 * Agrega un sufijo incremental cuando el slug base ya está ocupado.
 * Mantiene el largo dentro del límite de la columna `stories.slug`.
 */
export function buildSlugWithSuffix(baseSlug: string, suffix: number): string {
  const tail = `-${suffix}`;
  return `${baseSlug.slice(0, 220 - tail.length)}${tail}`;
}
