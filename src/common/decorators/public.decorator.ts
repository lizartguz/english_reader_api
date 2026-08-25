import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca una ruta como pública para que el guard de autenticación la ignore.
 * Debe usarse solo en endpoints que no dependan de una cuenta.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
