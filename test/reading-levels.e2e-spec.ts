import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/database/prisma.service';
import { PasswordHasherService } from '@/common/security/password-hasher.service';
import { RoleCode } from '@/common/enums/role-code.enum';
import { ErrorCode } from '@/common/constants/error-codes.constants';
import {
  createE2eApp,
  createTestUser,
  loginAs,
  resetDatabase,
  seedAccessControl,
} from './helpers/e2e-app';

const BASE = '/api/v1/admin/reading-levels';

describe('Niveles de lectura (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwordHasher: PasswordHasherService;
  let adminToken: string;
  let clientToken: string;

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

    const admin = await createTestUser(prisma, passwordHasher, {
      email: 'admin@test.local',
      roleCode: RoleCode.Admin,
    });
    const client = await createTestUser(prisma, passwordHasher, {
      email: 'cliente@test.local',
      roleCode: RoleCode.Client,
    });

    adminToken = await loginAs(app, admin);
    clientToken = await loginAs(app, client);
  });

  it('rechaza a un CLIENT sin importar el permiso', async () => {
    const response = await request(app.getHttpServer())
      .get(BASE)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);

    expect(response.body.code).toBe(ErrorCode.Forbidden);
  });

  it('crea, lista, actualiza y elimina un nivel de lectura', async () => {
    const created = await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'a1', name: 'Principiante', sortOrder: 1 })
      .expect(201);

    // El código se normaliza a mayúsculas.
    expect(created.body.data.code).toBe('A1');

    const list = await request(app.getHttpServer())
      .get(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(list.body.data).toHaveLength(1);
    expect(list.body.meta.pagination.total).toBe(1);

    const updated = await request(app.getHttpServer())
      .patch(`${BASE}/${created.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Principiante actualizado', isActive: false })
      .expect(200);

    expect(updated.body.data.name).toBe('Principiante actualizado');
    expect(updated.body.data.isActive).toBe(false);

    await request(app.getHttpServer())
      .delete(`${BASE}/${created.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const afterDelete = await request(app.getHttpServer())
      .get(`${BASE}/${created.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(afterDelete.body.code).toBe(ErrorCode.NotFound);
  });

  it('rechaza un código duplicado', async () => {
    await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'A1', name: 'Principiante' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'A1', name: 'Otro nombre' })
      .expect(409);

    expect(response.body.code).toBe(ErrorCode.Conflict);
  });

  it('no permite eliminar un nivel que aún tiene historias asociadas', async () => {
    const level = await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'B1', name: 'Intermedio' })
      .expect(201);

    await prisma.story.create({
      data: {
        title: 'Historia de prueba',
        slug: 'historia-de-prueba',
        content: 'Contenido',
        readingLevelId: level.body.data.id,
      },
    });

    const response = await request(app.getHttpServer())
      .delete(`${BASE}/${level.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);

    expect(response.body.code).toBe(ErrorCode.Conflict);
  });
});
