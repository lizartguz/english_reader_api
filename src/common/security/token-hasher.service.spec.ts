import { TokenHasherService } from './token-hasher.service';

describe('TokenHasherService', () => {
  const service = new TokenHasherService();

  it('genera tokens distintos en cada llamada', () => {
    expect(service.generate()).not.toBe(service.generate());
  });

  it('genera tokens con entropía suficiente', () => {
    // 48 bytes en hexadecimal equivalen a 96 caracteres.
    expect(service.generate()).toHaveLength(96);
  });

  it('produce el mismo hash para el mismo token', () => {
    const token = service.generate();

    expect(service.hash(token)).toBe(service.hash(token));
  });

  it('nunca devuelve el token en claro dentro del hash', () => {
    const token = service.generate();

    expect(service.hash(token)).not.toContain(token);
  });

  it('reconoce un token válido contra su hash', () => {
    const token = service.generate();

    expect(service.matches(token, service.hash(token))).toBe(true);
  });

  it('rechaza un token distinto', () => {
    const token = service.generate();

    expect(service.matches(service.generate(), service.hash(token))).toBe(false);
  });

  it('rechaza un hash con longitud inesperada sin lanzar excepción', () => {
    expect(service.matches(service.generate(), 'abc')).toBe(false);
  });
});
