import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/database/prisma.service';
import { PasswordHasherService } from '@/common/security/password-hasher.service';
import { validationExceptionFactory } from '@/common/pipes/validation-exception.factory';
import { RoleCode } from '@/common/enums/role-code.enum';
import { UserStatus } from '@/common/enums/domain.enums';
import {
  ALL_PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
  splitPermissionCode,
} from '@/common/enums/permission.enum';
import { ROLE_PERMISSIONS_MATRIX, SYSTEM_ROLES } from '@/common/constants/role-permissions.matrix';

/** Aplicación de pruebas junto con los servicios que las suites necesitan. */
export interface E2eContext {
  app: INestApplication;
  prisma: PrismaService;
  passwordHasher: PasswordHasherService;
}

/**
 * Arranca la aplicación con la misma configuración transversal que `main.ts`.
 *
 * Se replican el prefijo, el versionado, el pipe de validación y el lector de
 * cookies para que las pruebas ejerciten los mismos contratos que producción.
 */
export async function createE2eApp(): Promise<E2eContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication();

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1', prefix: 'v' });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      exceptionFactory: validationExceptionFactory,
    }),
  );

  await app.init();

  return {
    app,
    prisma: app.get(PrismaService),
    passwordHasher: app.get(PasswordHasherService),
  };
}

/**
 * Vacía las tablas de datos entre suites respetando el orden de las claves
 * foráneas. Los catálogos de roles y permisos se conservan porque los recrea
 * `seedAccessControl`.
 */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.emailVerificationToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.readingProgress.deleteMany();
  await prisma.userSavedWord.deleteMany();
  await prisma.wordExample.deleteMany();
  await prisma.wordPronunciation.deleteMany();
  await prisma.wordTranslation.deleteMany();
  await prisma.wordEntry.deleteMany();
  await prisma.storyAsset.deleteMany();
  await prisma.storyGenre.deleteMany();
  await prisma.story.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.readingLevel.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.systemLog.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
  // Los roles creados por pruebas no deben sobrevivir entre corridas e2e.
  await prisma.rolePermission.deleteMany();
  await prisma.role.deleteMany({ where: { isSystem: false } });
}

/** Crea los permisos, roles y la matriz inicial que necesitan las pruebas. */
export async function seedAccessControl(prisma: PrismaService): Promise<void> {
  for (const code of ALL_PERMISSIONS) {
    const { module, action } = splitPermissionCode(code);

    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, module, action, description: PERMISSION_DESCRIPTIONS[code] },
    });
  }

  for (const role of SYSTEM_ROLES) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: {},
      create: { code: role.code, name: role.name, description: role.description, isSystem: true },
    });
  }

  for (const [roleCode, permissions] of Object.entries(ROLE_PERMISSIONS_MATRIX)) {
    if (permissions.length === 0) continue;

    const role = await prisma.role.findUniqueOrThrow({
      where: { code: roleCode },
      select: { id: true },
    });

    const rows = await prisma.permission.findMany({
      where: { code: { in: [...permissions] } },
      select: { id: true },
    });

    await prisma.rolePermission.createMany({
      data: rows.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
      skipDuplicates: true,
    });
  }
}

/** Datos de un usuario creado para una prueba. */
export interface TestUser {
  id: string;
  email: string;
  password: string;
}

/** Crea un usuario con el rol y estado indicados. */
export async function createTestUser(
  prisma: PrismaService,
  passwordHasher: PasswordHasherService,
  options: {
    email: string;
    password?: string;
    roleCode: RoleCode;
    status?: UserStatus;
  },
): Promise<TestUser> {
  const password = options.password ?? 'Prueba123';

  const role = await prisma.role.findUniqueOrThrow({
    where: { code: options.roleCode },
    select: { id: true },
  });

  const user = await prisma.user.create({
    data: {
      email: options.email,
      passwordHash: await passwordHasher.hash(password),
      firstName: 'Usuario',
      lastName: 'De Prueba',
      status: options.status ?? UserStatus.active,
      emailVerifiedAt: new Date(),
      roles: { create: { roleId: role.id } },
    },
    select: { id: true, email: true },
  });

  return { id: user.id, email: user.email, password };
}

/**
 * Inicia sesión vía HTTP y devuelve el access token.
 * Se usa en las suites de módulos administrativos para no repetir el flujo de login.
 */
export async function loginAs(app: INestApplication, user: TestUser): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: user.email, password: user.password, clientType: 'mobile' })
    .expect(200);

  return response.body.data.accessToken as string;
}

/**
 * Crea un nivel de lectura directamente en base de datos.
 * Se usa como dato de apoyo en suites que no prueban el CRUD de niveles.
 */
export async function createReadingLevel(
  prisma: PrismaService,
  overrides: { code?: string; isActive?: boolean } = {},
) {
  return prisma.readingLevel.create({
    data: {
      code: overrides.code ?? 'A1',
      name: 'Nivel de prueba',
      isActive: overrides.isActive ?? true,
    },
  });
}
