import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SeedsModule } from './seeds.module';
import { SeedRunner } from './seed.runner';

/**
 * Punto de entrada de los seeders.
 *
 * Se ejecuta como contexto de aplicación de Nest para reutilizar la misma
 * configuración, conexión y servicios de hashing que usa la API, evitando que
 * los datos sembrados diverjan de las reglas del sistema.
 */
async function runSeed(): Promise<void> {
  const logger = new Logger('Seed');
  const context = await NestFactory.createApplicationContext(SeedsModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    await context.get(SeedRunner).run();
  } catch (error) {
    logger.error(`Falló la carga de datos semilla: ${(error as Error).message}`);
    process.exitCode = 1;
  } finally {
    await context.close();
  }
}

void runSeed();
