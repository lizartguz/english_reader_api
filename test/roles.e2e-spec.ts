import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/database/prisma.service';
import { PasswordHasherService } from '@/common/security/password-hasher.service';
import { RoleCode } from '@/common/enums/role-code.enum';
import { PermissionCode } from '@/common/enums/permission.enum';
import { ErrorCode } from '@/common/constants/error-codes.constants';
import {
  createE2eApp,
  createTestUser,
  loginAs,
  resetDatabase,
  seedAccessControl,
} from './helpers/e2e-app';

const BASE = '/api/v1/admin/roles';

describe('Roles y permisos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwordHasher: PasswordHasherService;
  let superAdminToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const context = await createE2eApp();
    app = context.app;
    prisma = context.prisma;
    passwordHasher = context.passwordHasher;
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await seedAccessControl(prisma);

    const superAdmin = await createTestUser(prisma, passwordHasher, {
      email: 'super@test.local',
      roleCode: RoleCode.SuperAdmin,
    });
    const admin = await createTestUser(prisma, passwordHasher, {
      email: 'admin@test.local',
      roleCode: RoleCode.Admin,
    });

    superAdminToken = await loginAs(app, superAdmin);
    adminToken = await loginAs(app, admin);
  });

  it('un ADMIN puede listar roles pero no crearlos', async () => {
    await request(app.getHttpServer())
      .get(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const response = await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'EDITOR', name: 'Editor' })
      .expect(403);

    expect(response.body.code).toBe(ErrorCode.Forbidden);
  });

  it('un SUPER_ADMIN crea un rol con permisos iniciales', async () => {
    const response = await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        code: 'editor',
        name: 'Editor de contenido',
        permissionCodes: [PermissionCode.StoriesRead, PermissionCode.StoriesUpdate],
      })
      .expect(201);

    expect(response.body.data.code).toBe('EDITOR');
    expect(response.body.data.permissions).toEqual([
      PermissionCode.StoriesRead,
      PermissionCode.StoriesUpdate,
    ]);
    expect(response.body.data.isSystem).toBe(false);
  });

  it('protege los roles base del sistema contra renombrado y eliminación', async () => {
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.Admin } });

    const renameResponse = await request(app.getHttpServer())
      .patch(`${BASE}/${adminRole.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'Nombre cambiado' })
      .expect(403);

    expect(renameResponse.body.code).toBe(ErrorCode.Forbidden);

    const deleteResponse = await request(app.getHttpServer())
      .delete(`${BASE}/${adminRole.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(403);

    expect(deleteResponse.body.code).toBe(ErrorCode.Forbidden);
  });

  it('permite ajustar los permisos de un rol base como ADMIN', async () => {
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.Admin } });

    const response = await request(app.getHttpServer())
      .patch(`${BASE}/${adminRole.id}/permissions`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ permissionCodes: [PermissionCode.StoriesRead] })
      .expect(200);

    expect(response.body.data.permissions).toEqual([PermissionCode.StoriesRead]);
  });

  it('no permite eliminar un rol que aún tiene usuarios asignados', async () => {
    const created = await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ code: 'REVIEWER', name: 'Revisor' })
      .expect(201);

    const role = await prisma.role.findUniqueOrThrow({ where: { code: 'REVIEWER' } });

    await createTestUser(prisma, passwordHasher, {
      email: 'revisor@test.local',
      roleCode: 'REVIEWER' as RoleCode,
    });

    const response = await request(app.getHttpServer())
      .delete(`${BASE}/${role.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(409);

    expect(response.body.code).toBe(ErrorCode.Conflict);
    expect(created.body.data.id).toBe(role.id);
  });

  it('rechaza un permiso inexistente al crear un rol', async () => {
    const response = await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ code: 'BROKEN', name: 'Roto', permissionCodes: ['not.a.permission'] })
      .expect(400);

    expect(response.body.code).toBe(ErrorCode.ValidationFailed);
  });

  it('lista el catálogo de permisos', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/permissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0]).toHaveProperty('code');
    expect(response.body.data[0]).toHaveProperty('module');
  });
});
