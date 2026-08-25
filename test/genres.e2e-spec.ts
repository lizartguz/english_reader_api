import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/database/prisma.service';
import { PasswordHasherService } from '@/common/security/password-hasher.service';
import { RoleCode } from '@/common/enums/role-code.enum';
import { ErrorCode } from '@/common/constants/error-codes.constants';
import {
  createE2eApp,
  createReadingLevel,
  createTestUser,
  loginAs,
  resetDatabase,
  seedAccessControl,
} from './helpers/e2e-app';

const BASE = '/api/v1/admin/genres';

describe('Géneros literarios (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwordHasher: PasswordHasherService;
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

    const admin = await createTestUser(prisma, passwordHasher, {
      email: 'admin@test.local',
      roleCode: RoleCode.Admin,
    });

    adminToken = await loginAs(app, admin);
  });

  it('crea, lista, actualiza y elimina un género', async () => {
    const created = await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'adventure', name: 'Aventura' })
      .expect(201);

    expect(created.body.data.code).toBe('ADVENTURE');

    const updated = await request(app.getHttpServer())
      .patch(`${BASE}/${created.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Aventura y misterio' })
      .expect(200);

    expect(updated.body.data.name).toBe('Aventura y misterio');

    await request(app.getHttpServer())
      .delete(`${BASE}/${created.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('rechaza un código duplicado', async () => {
    await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'DRAMA', name: 'Drama' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'DRAMA', name: 'Otro' })
      .expect(409);

    expect(response.body.code).toBe(ErrorCode.Conflict);
  });

  it('no permite eliminar un género que aún tiene historias asociadas', async () => {
    const level = await createReadingLevel(prisma);

    const genre = await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'FANTASY', name: 'Fantasía' })
      .expect(201);

    await prisma.story.create({
      data: {
        title: 'Historia con género',
        slug: 'historia-con-genero',
        content: 'Contenido',
        readingLevelId: level.id,
        genres: { create: { genreId: genre.body.data.id } },
      },
    });

    const response = await request(app.getHttpServer())
      .delete(`${BASE}/${genre.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);

    expect(response.body.code).toBe(ErrorCode.Conflict);
  });
});
