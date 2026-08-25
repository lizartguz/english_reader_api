import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database/prisma.service';
import { PasswordHasherService } from '@/common/security/password-hasher.service';
import { RoleCode } from '@/common/enums/role-code.enum';
import { UserStatus } from '@/common/enums/domain.enums';
import { AppEnvironment } from '@/config/env.validation';

/** Definición de un usuario semilla leída desde variables de entorno. */
interface SeedUserDefinition {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleCode: RoleCode;
}

/**
 * Crea el usuario `SUPER_ADMIN` inicial y un usuario `ADMIN` operativo.
 *
 * Las credenciales nunca se codifican en el repositorio: se leen de variables
 * de entorno. Si no están definidas, el seeder omite la creación en lugar de
 * inventar una contraseña por defecto, para no dejar una cuenta previsible.
 *
 * Sobre una cuenta ya existente no se sobrescribe la contraseña: sembrar de
 * nuevo no debe revertir un cambio hecho por el propio administrador.
 */
@Injectable()
export class UsersSeeder {
  private readonly logger = new Logger(UsersSeeder.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly configService: ConfigService,
  ) {}

  async run(): Promise<void> {
    const definitions = this.readDefinitions();

    for (const definition of definitions) {
      await this.createIfMissing(definition);
    }
  }

  /** Lee las credenciales semilla del entorno. */
  private readDefinitions(): SeedUserDefinition[] {
    const definitions: SeedUserDefinition[] = [];

    const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL;
    const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD;
    const adminEmail = process.env.SEED_ADMIN_EMAIL;
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;

    if (superAdminEmail && superAdminPassword) {
      definitions.push({
        email: superAdminEmail.toLowerCase(),
        password: superAdminPassword,
        firstName: 'Super',
        lastName: 'Administrador',
        roleCode: RoleCode.SuperAdmin,
      });
    } else {
      this.logger.warn(
        'SEED_SUPER_ADMIN_EMAIL o SEED_SUPER_ADMIN_PASSWORD no están definidos: se omite el super administrador.',
      );
    }

    if (adminEmail && adminPassword) {
      definitions.push({
        email: adminEmail.toLowerCase(),
        password: adminPassword,
        firstName: 'Administrador',
        lastName: 'General',
        roleCode: RoleCode.Admin,
      });
    } else {
      this.logger.warn(
        'SEED_ADMIN_EMAIL o SEED_ADMIN_PASSWORD no están definidos: se omite el administrador.',
      );
    }

    return definitions;
  }

  /** Crea el usuario y le asigna su rol dentro de una misma transacción. */
  private async createIfMissing(definition: SeedUserDefinition): Promise<void> {
    const existing = await this.prisma.user.findUnique({
      where: { email: definition.email },
      select: { id: true },
    });

    if (existing) {
      // Se garantiza el rol, por si la asignación se perdió, sin tocar la contraseña.
      await this.ensureRole(existing.id, definition.roleCode);
      this.logger.log(`Usuario ${definition.email} ya existe; se verificó su rol.`);
      return;
    }

    const role = await this.prisma.role.findUniqueOrThrow({
      where: { code: definition.roleCode },
      select: { id: true },
    });

    const passwordHash = await this.passwordHasher.hash(definition.password);

    await this.prisma.runInTransaction(async (tx) => {
      await tx.user.create({
        data: {
          email: definition.email,
          passwordHash,
          firstName: definition.firstName,
          lastName: definition.lastName,
          status: UserStatus.active,
          emailVerifiedAt: new Date(),
          roles: { create: { roleId: role.id } },
        },
      });
    });

    this.logger.log(`Usuario ${definition.roleCode} creado: ${definition.email}.`);
    this.warnAboutTemporaryCredentials();
  }

  /** Asegura que el usuario conserve su rol base. */
  private async ensureRole(userId: string, roleCode: RoleCode): Promise<void> {
    const role = await this.prisma.role.findUniqueOrThrow({
      where: { code: roleCode },
      select: { id: true },
    });

    await this.prisma.userRole.createMany({
      data: [{ userId, roleId: role.id }],
      skipDuplicates: true,
    });
  }

  /** Recuerda cambiar las credenciales cuando el ambiente no es local. */
  private warnAboutTemporaryCredentials(): void {
    const environment = this.configService.get<AppEnvironment>('app.env');

    if (environment !== AppEnvironment.Development) {
      this.logger.warn(
        'Se creó un usuario administrativo con credenciales de entorno. Cámbialas de inmediato.',
      );
    }
  }
}
