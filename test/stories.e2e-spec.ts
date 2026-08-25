import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/database/prisma.service';
import { PasswordHasherService } from '@/common/security/password-hasher.service';
import { RoleCode } from '@/common/enums/role-code.enum';
import { StoryStatus } from '@/common/enums/domain.enums';
import { ErrorCode } from '@/common/constants/error-codes.constants';
import {
  createE2eApp,
  createReadingLevel,
  createTestUser,
  loginAs,
  resetDatabase,
  seedAccessControl,
} from './helpers/e2e-app';

const BASE = '/api/v1/admin/stories';

describe('Historias (e2e)', () => {
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

  it('crea una historia en borrador con slug generado a partir del título', async () => {
    const level = await createReadingLevel(prisma);

    const response = await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'The Red Umbrella!',
        readingLevelId: level.id,
        content: 'Once upon a time...',
      })
      .expect(201);

    expect(response.body.data.slug).toBe('the-red-umbrella');
    expect(response.body.data.status).toBe(StoryStatus.draft);
    expect(response.body.data.publishedAt).toBeNull();
  });

  it('agrega un sufijo cuando el slug ya existe', async () => {
    const level = await createReadingLevel(prisma);

    const first = await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'A Story', readingLevelId: level.id, content: 'Content' })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'A Story', readingLevelId: level.id, content: 'Content' })
      .expect(201);

    expect(first.body.data.slug).toBe('a-story');
    expect(second.body.data.slug).toBe('a-story-2');
  });

  it('asocia géneros a la historia dentro de la misma transacción', async () => {
    const level = await createReadingLevel(prisma);

    const genre = await request(app.getHttpServer())
      .post('/api/v1/admin/genres')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'ADVENTURE', name: 'Aventura' })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'An Adventure',
        readingLevelId: level.id,
        content: 'Content',
        genreIds: [genre.body.data.id],
      })
      .expect(201);

    expect(created.body.data.genres).toHaveLength(1);
    expect(created.body.data.genres[0].code).toBe('ADVENTURE');
  });

  it('rechaza un género inexistente', async () => {
    const level = await createReadingLevel(prisma);

    const response = await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Invalid Genre Story',
        readingLevelId: level.id,
        content: 'Content',
        genreIds: ['00000000-0000-7000-8000-000000000000'],
      })
      .expect(422);

    expect(response.body.code).toBe(ErrorCode.BusinessRule);
  });

  it('publica una historia cuando el nivel está activo', async () => {
    const level = await createReadingLevel(prisma, { isActive: true });

    const created = await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Publishable Story', readingLevelId: level.id, content: 'Content' })
      .expect(201);

    const published = await request(app.getHttpServer())
      .patch(`${BASE}/${created.body.data.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: StoryStatus.published })
      .expect(200);

    expect(published.body.data.status).toBe(StoryStatus.published);
    expect(published.body.data.publishedAt).not.toBeNull();
  });

  it('no permite publicar una historia con nivel inactivo', async () => {
    const level = await createReadingLevel(prisma, { isActive: false });

    const created = await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Blocked Story', readingLevelId: level.id, content: 'Content' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`${BASE}/${created.body.data.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: StoryStatus.published })
      .expect(422);

    expect(response.body.code).toBe(ErrorCode.BusinessRule);
  });

  it('no permite pasar directamente de published a la misma transición inválida', async () => {
    const level = await createReadingLevel(prisma);

    const created = await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'State Machine Story', readingLevelId: level.id, content: 'Content' })
      .expect(201);

    // draft -> archived está permitido.
    await request(app.getHttpServer())
      .patch(`${BASE}/${created.body.data.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: StoryStatus.archived })
      .expect(200);

    // archived -> published exige nivel activo; con nivel activo debe funcionar.
    const republished = await request(app.getHttpServer())
      .patch(`${BASE}/${created.body.data.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: StoryStatus.published })
      .expect(200);

    expect(republished.body.data.status).toBe(StoryStatus.published);
  });

  it('conserva la fecha de publicación al archivar y solo la renueva al republicar', async () => {
    const level = await createReadingLevel(prisma);

    const created = await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Timeline Story', readingLevelId: level.id, content: 'Content' })
      .expect(201);

    const published = await request(app.getHttpServer())
      .patch(`${BASE}/${created.body.data.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: StoryStatus.published })
      .expect(200);

    const firstPublishedAt = published.body.data.publishedAt;

    const archived = await request(app.getHttpServer())
      .patch(`${BASE}/${created.body.data.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: StoryStatus.archived })
      .expect(200);

    // Al archivar se conserva el registro histórico de publicación.
    expect(archived.body.data.publishedAt).toBe(firstPublishedAt);
  });

  it('filtra el listado por estado y por nivel de lectura', async () => {
    const levelA = await createReadingLevel(prisma, { code: 'A1' });
    const levelB = await createReadingLevel(prisma, { code: 'B1' });

    await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Story A', readingLevelId: levelA.id, content: 'Content' })
      .expect(201);

    const storyB = await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Story B', readingLevelId: levelB.id, content: 'Content' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`${BASE}/${storyB.body.data.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: StoryStatus.published })
      .expect(200);

    const filtered = await request(app.getHttpServer())
      .get(`${BASE}?readingLevelId=${levelB.id}&status=published`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0].title).toBe('Story B');
  });

  it('elimina lógicamente una historia', async () => {
    const level = await createReadingLevel(prisma);

    const created = await request(app.getHttpServer())
      .post(BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Deletable Story', readingLevelId: level.id, content: 'Content' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`${BASE}/${created.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`${BASE}/${created.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
