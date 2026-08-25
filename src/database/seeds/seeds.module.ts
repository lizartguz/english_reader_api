import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configurations, validateEnvironment } from '@/config';
import { PrismaModule } from '@/database/prisma.module';
import { SecurityModule } from '@/common/security/security.module';
import { RolesPermissionsSeeder } from './roles-permissions.seeder';
import { ReadingLevelsSeeder } from './reading-levels.seeder';
import { UsersSeeder } from './users.seeder';
import { StoriesSeeder } from './stories.seeder';
import { SeedRunner } from './seed.runner';

/**
 * Contexto mínimo para ejecutar los seeders fuera del servidor HTTP.
 * No carga controladores ni guards: solo configuración, base de datos y hashing.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: configurations,
      validate: validateEnvironment,
    }),
    PrismaModule,
    SecurityModule,
  ],
  providers: [RolesPermissionsSeeder, ReadingLevelsSeeder, UsersSeeder, StoriesSeeder, SeedRunner],
})
export class SeedsModule {}
