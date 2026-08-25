/** Multiplicadores admitidos en las duraciones de configuración. */
const UNIT_TO_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

/**
 * Convierte duraciones del estilo `15m`, `8h` o `30d` a segundos.
 *
 * Se usa para calcular vencimientos de tokens y de cookies a partir de las
 * variables de entorno, sin repetir cálculos mágicos por el código.
 */
export function parseDurationToSeconds(duration: string, fallbackSeconds: number): number {
  const match = /^(\d+)\s*([smhd])$/i.exec(duration.trim());

  if (!match) {
    const asNumber = Number.parseInt(duration, 10);
    return Number.isFinite(asNumber) && asNumber > 0 ? asNumber : fallbackSeconds;
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  return amount * (UNIT_TO_SECONDS[unit] ?? 1);
}

/** Devuelve una fecha desplazada la cantidad de segundos indicada. */
export function addSeconds(base: Date, seconds: number): Date {
  return new Date(base.getTime() + seconds * 1000);
}

/** Devuelve una fecha desplazada la cantidad de horas indicada. */
export function addHours(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 3600 * 1000);
}

/** Devuelve una fecha desplazada la cantidad de minutos indicada. */
export function addMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60 * 1000);
}

/** Devuelve una fecha desplazada la cantidad de meses indicada hacia atrás. */
export function subtractMonths(base: Date, months: number): Date {
  const result = new Date(base);
  result.setMonth(result.getMonth() - months);
  return result;
}
