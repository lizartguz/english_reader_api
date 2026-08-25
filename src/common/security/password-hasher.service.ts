import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import type { Algorithm } from '@node-rs/argon2';

/**
 * Parámetros de Argon2id.
 *
 * Se eligió Argon2id (recomendado en la planificación de seguridad) por su
 * resistencia a ataques con GPU y a ataques de canal lateral. Los valores
 * siguen las recomendaciones de OWASP para uso general en servidor.
 */
// `Algorithm` es un `const enum` de la librería y no existe en tiempo de
// ejecución, por lo que no puede leerse con `isolatedModules` activo. Se usa
// su valor documentado: Argon2d = 0, Argon2i = 1, Argon2id = 2.
const ARGON2ID = 2 as Algorithm;

const ARGON2_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * Calcula y verifica hashes de contraseña.
 *
 * Las contraseñas nunca se almacenan ni se registran en texto plano, y el hash
 * jamás debe devolverse por la API.
 */
@Injectable()
export class PasswordHasherService {
  /** Genera el hash de una contraseña en texto plano. */
  hash(plainPassword: string): Promise<string> {
    return hash(plainPassword, ARGON2_OPTIONS);
  }

  /**
   * Compara una contraseña con su hash almacenado.
   * Devuelve `false` ante un hash corrupto en lugar de propagar el error.
   */
  async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    try {
      return await verify(passwordHash, plainPassword, ARGON2_OPTIONS);
    } catch {
      return false;
    }
  }
}
