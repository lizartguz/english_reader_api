/**
 * Prepara la base de datos de pruebas end to end.
 *
 * Crea el esquema si no existe y aplica las migraciones ya versionadas. Se
 * ejecuta contra una base separada para que las suites nunca toquen los datos
 * de desarrollo.
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const mariadb = require('mariadb');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.test') });

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));

  const connection = await mariadb.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.end();

  console.log(`Base de pruebas lista: ${databaseName}`);

  const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env },
  });

  process.exit(result.status ?? 0);
}

main().catch((error) => {
  console.error(`No se pudo preparar la base de pruebas: ${error.message}`);
  process.exit(1);
});
