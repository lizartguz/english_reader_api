import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/database/prisma.service';
import { PasswordHasherService } from '@/common/security/password-hasher.service';
import { RoleCode } from '@/common/enums/role-code.enum';
import { UserStatus } from '@/common/enums/domain.enums';
import { ErrorCode } from '@/common/constants/error-codes.constants';
import {
  createE2eApp,
  createTestUser,
  loginAs,
  resetDatabase,
  seedAccessControl,
  type TestUser,
} from './helpers/e2e-app';

const BASE = '/api/v1/admin/users';

describe('Usuarios administrativos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwordHasher: PasswordHasherService;

  let superAdmin: TestUser;
  let admin: TestUser;
  let client: TestUser;
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

    superAdmin = await createTestUser(prisma, passwordHasher, {
      email: 'super@test.local',
      roleCode: RoleCode.SuperAdmin,
    });
    admin = await createTestUser(prisma, passwordHasher, {
      email: 'admin@test.local',
      roleCode: RoleCode.Admin,
    });
    client = await createTestUser(prisma, passwordHasher, {
      email: 'cliente@test.local',
      roleCode: RoleCode.Client,
    });

    superAdminToken = await loginAs(app, superAdmin);
    adminToken = await loginAs(app, admin);
  });

  describe('Creación', () => {
    it('un ADMIN puede crear un usuario CLIENT', async () => {
      const response = await request(app.getHttpServer())
        .post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'nuevo-cliente@test.local',
          password: 'Passw0rd1',
          firstName: 'Nuevo',
          lastName: 'Cliente',
          roleCodes: [RoleCode.Client],
        })
        .expect(201);

      expect(response.body.data.roles).toEqual([RoleCode.Client]);
      expect(response.body.data).not.toHaveProperty('passwordHash');
    });

    it('un ADMIN no puede crear un usuario con rol ADMIN', async () => {
      const response = await request(app.getHttpServer())
        .post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'otro-admin@test.local',
          password: 'Passw0rd1',
          firstName: 'Otro',
          lastName: 'Admin',
          roleCodes: [RoleCode.Admin],
        })
        .expect(403);

      expect(response.body.code).toBe(ErrorCode.Forbidden);
    });

    it('un SUPER_ADMIN sí puede crear un usuario ADMIN', async () => {
      const response = await request(app.getHttpServer())
        .post(BASE)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'nuevo-admin@test.local',
          password: 'Passw0rd1',
          firstName: 'Nuevo',
          lastName: 'Admin',
          roleCodes: [RoleCode.Admin],
        })
        .expect(201);

      expect(response.body.data.roles).toEqual([RoleCode.Admin]);
    });

    it('rechaza un correo ya registrado', async () => {
      const response = await request(app.getHttpServer())
        .post(BASE)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: client.email,
          password: 'Passw0rd1',
          firstName: 'Duplicado',
          lastName: 'Cliente',
          roleCodes: [RoleCode.Client],
        })
        .expect(409);

      expect(response.body.code).toBe(ErrorCode.Conflict);
    });
  });

  describe('Protección de cuentas administrativas', () => {
    it('un ADMIN no puede cambiar el estado de un SUPER_ADMIN', async () => {
      const response = await request(app.getHttpServer())
        .patch(`${BASE}/${superAdmin.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: UserStatus.blocked })
        .expect(403);

      expect(response.body.code).toBe(ErrorCode.Forbidden);
    });

    it('un ADMIN no puede eliminar a otro ADMIN', async () => {
      const otherAdmin = await createTestUser(prisma, passwordHasher, {
        email: 'otro-admin-2@test.local',
        roleCode: RoleCode.Admin,
      });

      const response = await request(app.getHttpServer())
        .delete(`${BASE}/${otherAdmin.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body.code).toBe(ErrorCode.Forbidden);
    });

    it('un ADMIN no puede ascender a un CLIENT a ADMIN', async () => {
      const response = await request(app.getHttpServer())
        .patch(`${BASE}/${client.id}/roles`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleCodes: [RoleCode.Admin] })
        .expect(403);

      expect(response.body.code).toBe(ErrorCode.Forbidden);
    });

    it('un SUPER_ADMIN sí puede ascender a un CLIENT', async () => {
      const response = await request(app.getHttpServer())
        .patch(`${BASE}/${client.id}/roles`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ roleCodes: [RoleCode.Admin] })
        .expect(200);

      expect(response.body.data.roles).toEqual([RoleCode.Admin]);
    });

    it('nadie puede cambiar los roles de su propia cuenta', async () => {
      // Sin esta guarda, el único SUPER_ADMIN puede degradarse a CLIENT y
      // quedar fuera: asignar SUPER_ADMIN exige ya ser SUPER_ADMIN.
      const response = await request(app.getHttpServer())
        .patch(`${BASE}/${superAdmin.id}/roles`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ roleCodes: [RoleCode.Client] })
        .expect(403);

      expect(response.body.code).toBe(ErrorCode.Forbidden);

      const sigueIgual = await request(app.getHttpServer())
        .get(`${BASE}/${superAdmin.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(sigueIgual.body.data.roles).toEqual([RoleCode.SuperAdmin]);
    });

    it('un ADMIN sí puede gestionar a un CLIENT', async () => {
      const response = await request(app.getHttpServer())
        .patch(`${BASE}/${client.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: UserStatus.inactive })
        .expect(200);

      expect(response.body.data.status).toBe(UserStatus.inactive);
    });
  });

  describe('Protección de la propia cuenta', () => {
    it('nadie puede cambiar el estado de su propia cuenta', async () => {
      const response = await request(app.getHttpServer())
        .patch(`${BASE}/${admin.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: UserStatus.inactive })
        .expect(403);

      expect(response.body.code).toBe(ErrorCode.Forbidden);
    });

    it('nadie puede eliminar su propia cuenta', async () => {
      const response = await request(app.getHttpServer())
        .delete(`${BASE}/${admin.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body.code).toBe(ErrorCode.Forbidden);
    });
  });

  describe('Revocación de sesión', () => {
    it('bloquear una cuenta invalida de inmediato su sesión activa', async () => {
      const clientToken = await loginAs(app, client);

      await request(app.getHttpServer())
        .get('/api/v1/auth/verify-session')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`${BASE}/${client.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: UserStatus.blocked })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/verify-session')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(401);

      expect(response.body.code).toBe(ErrorCode.AccountBlocked);
    });
  });

  describe('Listado y consulta', () => {
    it('un CLIENT no puede acceder al listado de usuarios', async () => {
      const clientToken = await loginAs(app, client);

      const response = await request(app.getHttpServer())
        .get(BASE)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(403);

      expect(response.body.code).toBe(ErrorCode.Forbidden);
    });

    it('filtra por rol', async () => {
      const response = await request(app.getHttpServer())
        .get(`${BASE}?roleCode=${RoleCode.Client}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].email).toBe(client.email);
    });
  });
});
