import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Bytes de entropía usados para los tokens opacos. */
const TOKEN_BYTES = 48;

/**
 * Genera y verifica tokens opacos de un solo uso o de larga duración
 * (refresh tokens, recuperación de contraseña y verificación de correo).
 *
 * Se usa SHA-256 y no Argon2 porque estos tokens ya tienen entropía alta:
 * no son adivinables por fuerza bruta y la verificación debe ser rápida, ya
 * que ocurre en cada renovación de sesión.
 */
@Injectable()
export class TokenHasherService {
  /** Crea un token aleatorio seguro en formato hexadecimal. */
  generate(): string {
    return randomBytes(TOKEN_BYTES).toString('hex');
  }

  /** Calcula el hash que se almacena en base de datos. */
  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Compara dos hashes en tiempo constante para evitar ataques de temporización. */
  matches(token: string, expectedHash: string): boolean {
    const actual = Buffer.from(this.hash(token), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');

    if (actual.length !== expected.length) return false;

    return timingSafeEqual(actual, expected);
  }
}
