import { config } from 'dotenv';
import { resolve } from 'node:path';

/**
 * Carga la configuración de pruebas antes de instanciar la aplicación.
 * Se usa una base de datos separada para no tocar los datos de desarrollo.
 */
config({ path: resolve(__dirname, '..', '.env.test'), override: true });
