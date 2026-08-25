import { PasswordHasherService } from './password-hasher.service';

describe('PasswordHasherService', () => {
  const service = new PasswordHasherService();

  it('nunca almacena la contraseña en claro', async () => {
    const hash = await service.hash('Secreta123');

    expect(hash).not.toContain('Secreta123');
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('genera hashes distintos para la misma contraseña por el salt aleatorio', async () => {
    const [first, second] = await Promise.all([
      service.hash('Secreta123'),
      service.hash('Secreta123'),
    ]);

    expect(first).not.toBe(second);
  });

  it('verifica correctamente la contraseña original', async () => {
    const hash = await service.hash('Secreta123');

    await expect(service.verify('Secreta123', hash)).resolves.toBe(true);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await service.hash('Secreta123');

    await expect(service.verify('Incorrecta123', hash)).resolves.toBe(false);
  });

  it('devuelve false ante un hash corrupto en lugar de propagar el error', async () => {
    await expect(service.verify('Secreta123', 'no-es-un-hash')).resolves.toBe(false);
  });
});
