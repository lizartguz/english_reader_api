import { sanitizeMetadata } from './sanitize.util';

describe('sanitizeMetadata', () => {
  it('oculta los valores con nombres sensibles', () => {
    const result = sanitizeMetadata({
      email: 'a@b.com',
      password: 'secreto',
      refreshToken: 'abc',
      apiKey: 'xyz',
      passwordHash: 'hash',
    }) as Record<string, unknown>;

    expect(result.email).toBe('a@b.com');
    expect(result.password).toBe('[oculto]');
    expect(result.refreshToken).toBe('[oculto]');
    expect(result.apiKey).toBe('[oculto]');
    expect(result.passwordHash).toBe('[oculto]');
  });

  it('oculta valores sensibles anidados', () => {
    const result = sanitizeMetadata({ user: { name: 'Ana', secret: 'x' } }) as {
      user: Record<string, unknown>;
    };

    expect(result.user.name).toBe('Ana');
    expect(result.user.secret).toBe('[oculto]');
  });

  it('recorta cadenas muy largas', () => {
    const result = sanitizeMetadata({ note: 'a'.repeat(2000) }) as Record<string, string>;

    expect(result.note.length).toBeLessThanOrEqual(1001);
    expect(result.note.endsWith('…')).toBe(true);
  });

  it('limita la cantidad de elementos de un arreglo', () => {
    const result = sanitizeMetadata(Array.from({ length: 200 }, (_, i) => i)) as unknown[];

    expect(result).toHaveLength(50);
  });

  it('corta las estructuras demasiado profundas', () => {
    const deep = { a: { b: { c: { d: { e: { f: 'demasiado profundo' } } } } } };

    expect(JSON.stringify(sanitizeMetadata(deep))).toContain('[oculto]');
  });

  it('convierte las fechas a texto ISO', () => {
    const date = new Date('2026-01-15T10:00:00.000Z');

    expect(sanitizeMetadata({ when: date })).toEqual({ when: '2026-01-15T10:00:00.000Z' });
  });
});
