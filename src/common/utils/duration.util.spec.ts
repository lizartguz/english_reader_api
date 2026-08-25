import {
  addHours,
  addMinutes,
  addSeconds,
  parseDurationToSeconds,
  subtractMonths,
} from './duration.util';

describe('parseDurationToSeconds', () => {
  it.each([
    ['30s', 30],
    ['15m', 900],
    ['8h', 28800],
    ['30d', 2592000],
  ])('convierte %s a %i segundos', (input, expected) => {
    expect(parseDurationToSeconds(input, 0)).toBe(expected);
  });

  it('acepta un número expresado como texto', () => {
    expect(parseDurationToSeconds('120', 0)).toBe(120);
  });

  it('cae al valor por defecto ante un formato inválido', () => {
    expect(parseDurationToSeconds('quince minutos', 900)).toBe(900);
  });
});

describe('helpers de fecha', () => {
  const base = new Date('2026-06-15T12:00:00.000Z');

  it('suma segundos', () => {
    expect(addSeconds(base, 60).toISOString()).toBe('2026-06-15T12:01:00.000Z');
  });

  it('suma minutos', () => {
    expect(addMinutes(base, 30).toISOString()).toBe('2026-06-15T12:30:00.000Z');
  });

  it('suma horas', () => {
    expect(addHours(base, 8).toISOString()).toBe('2026-06-15T20:00:00.000Z');
  });

  it('resta meses para las políticas de retención', () => {
    expect(subtractMonths(base, 6).toISOString()).toBe('2025-12-15T12:00:00.000Z');
  });
});
