import { Injectable, Logger } from '@nestjs/common';
import { RolesPermissionsSeeder } from './roles-permissions.seeder';
import { ReadingLevelsSeeder } from './reading-levels.seeder';
import { UsersSeeder } from './users.seeder';
import { StoriesSeeder } from './stories.seeder';

/**
 * Ejecuta los seeders en el orden en que dependen unos de otros:
 * roles y permisos, luego niveles, después usuarios y por último historias.
 */
@Injectable()
export class SeedRunner {
  private readonly logger = new Logger(SeedRunner.name);

  constructor(
    private readonly rolesPermissionsSeeder: RolesPermissionsSeeder,
    private readonly readingLevelsSeeder: ReadingLevelsSeeder,
    private readonly usersSeeder: UsersSeeder,
    private readonly storiesSeeder: StoriesSeeder,
  ) {}

  async run(): Promise<void> {
    this.logger.log('Iniciando la carga de datos semilla…');

    await this.rolesPermissionsSeeder.run();
    await this.readingLevelsSeeder.run();
    await this.usersSeeder.run();
    await this.storiesSeeder.run();

    this.logger.log('Datos semilla cargados correctamente.');
  }
}
