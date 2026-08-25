import { isLookupableWord, normalizeWord } from './word-normalizer.util';

describe('normalizeWord', () => {
  it('convierte a minúsculas', () => {
    expect(normalizeWord('Beautiful')).toBe('beautiful');
  });

  it('elimina la puntuación externa', () => {
    expect(normalizeWord('beautiful.')).toBe('beautiful');
    expect(normalizeWord('¿beautiful?')).toBe('beautiful');
    expect(normalizeWord('"beautiful",')).toBe('beautiful');
  });

  it('elimina los espacios sobrantes', () => {
    expect(normalizeWord('   beautiful   ')).toBe('beautiful');
  });

  it('conserva los apóstrofes internos porque distinguen palabras reales', () => {
    expect(normalizeWord("Don't")).toBe("don't");
    expect(normalizeWord("it's.")).toBe("it's");
  });

  it('conserva los guiones internos', () => {
    expect(normalizeWord('well-known!')).toBe('well-known');
  });

  it('colapsa espacios internos múltiples', () => {
    expect(normalizeWord('ice   cream')).toBe('ice cream');
  });
});

describe('isLookupableWord', () => {
  it('acepta palabras válidas', () => {
    expect(isLookupableWord('beautiful')).toBe(true);
    expect(isLookupableWord("don't")).toBe(true);
    expect(isLookupableWord('ice cream')).toBe(true);
  });

  it('rechaza cadenas vacías', () => {
    expect(isLookupableWord('')).toBe(false);
  });

  it('rechaza cadenas que no empiezan por letra', () => {
    expect(isLookupableWord('123')).toBe(false);
    expect(isLookupableWord('-abc')).toBe(false);
  });

  it('rechaza cadenas demasiado largas para la columna', () => {
    expect(isLookupableWord('a'.repeat(151))).toBe(false);
  });
});
