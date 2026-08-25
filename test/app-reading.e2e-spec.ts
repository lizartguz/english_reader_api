import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/database/prisma.service';
import { PasswordHasherService } from '@/common/security/password-hasher.service';
import { ErrorCode } from '@/common/constants/error-codes.constants';
import { FileAccessScope, StoryAssetType, StoryStatus } from '@/common/enums/domain.enums';
import { RoleCode } from '@/common/enums/role-code.enum';
import {
  createE2eApp,
  createReadingLevel,
  createTestUser,
  loginAs,
  resetDatabase,
  seedAccessControl,
} from './helpers/e2e-app';

const STORIES_BASE = '/api/v1/app/stories';
const PROGRESS_BASE = '/api/v1/app/reading-progress';

describe('Lectura móvil (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwordHasher: PasswordHasherService;
  let clientToken: string;
  let otherClientToken: string;
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

    const client = await createTestUser(prisma, passwordHasher, {
      email: 'reader@test.local',
      roleCode: RoleCode.Client,
    });
    const otherClient = await createTestUser(prisma, passwordHasher, {
      email: 'other-reader@test.local',
      roleCode: RoleCode.Client,
    });
    const admin = await createTestUser(prisma, passwordHasher, {
      email: 'reader-admin@test.local',
      roleCode: RoleCode.Admin,
    });

    clientToken = await loginAs(app, client);
    otherClientToken = await loginAs(app, otherClient);
    adminToken = await loginAs(app, admin);
  });

  it('lista solo historias publicadas para clientes', async () => {
    const published = await createStory({
      title: 'Published Story',
      status: StoryStatus.published,
    });
    await createStory({ title: 'Draft Story', status: StoryStatus.draft });

    const response = await request(app.getHttpServer())
      .get(STORIES_BASE)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(published.id);
    expect(response.body.data[0].content).toBeUndefined();
  });

  it('devuelve detalle de historia publicada con recursos disponibles', async () => {
    const story = await createStory({ title: 'Story With Cover', status: StoryStatus.published });
    await prisma.storyAsset.create({
      data: {
        storyId: story.id,
        type: StoryAssetType.cover_image,
        originalFileName: 'cover.webp',
        mimeType: 'image/webp',
        fileSizeBytes: 2048,
        accessScope: FileAccessScope.public,
        metadata: { width: 800, height: 600 },
      },
    });

    const response = await request(app.getHttpServer())
      .get(`${STORIES_BASE}/${story.id}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    expect(response.body.data.content).toBe('Once upon a time.');
    expect(response.body.data.assets[0]).toMatchObject({
      type: StoryAssetType.cover_image,
      originalFileName: 'cover.webp',
    });
  });

  it('no permite abrir historias no publicadas ni usar rutas app desde admin', async () => {
    const draft = await createStory({ title: 'Private Draft', status: StoryStatus.draft });

    const notAvailable = await request(app.getHttpServer())
      .get(`${STORIES_BASE}/${draft.id}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(404);

    expect(notAvailable.body.code).toBe(ErrorCode.NotFound);

    const forbidden = await request(app.getHttpServer())
      .get(STORIES_BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);

    expect(forbidden.body.code).toBe(ErrorCode.Forbidden);
  });

  it('guarda y consulta progreso solo del usuario autenticado', async () => {
    const story = await createStory({ title: 'Progress Story', status: StoryStatus.published });

    const saved = await request(app.getHttpServer())
      .patch(`${PROGRESS_BASE}/${story.id}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ progressPercent: 35.5, lastPosition: 'paragraph:3' })
      .expect(200);

    expect(saved.body.data.progressPercent).toBe(35.5);
    expect(saved.body.data.completedAt).toBeNull();

    const retrieved = await request(app.getHttpServer())
      .get(`${PROGRESS_BASE}/${story.id}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    expect(retrieved.body.data.lastPosition).toBe('paragraph:3');

    await request(app.getHttpServer())
      .get(`${PROGRESS_BASE}/${story.id}`)
      .set('Authorization', `Bearer ${otherClientToken}`)
      .expect(404);
  });

  it('marca una historia como completada desde progreso', async () => {
    const story = await createStory({ title: 'Completed Story', status: StoryStatus.published });

    const response = await request(app.getHttpServer())
      .patch(`${PROGRESS_BASE}/${story.id}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ completed: true })
      .expect(200);

    expect(response.body.data.progressPercent).toBe(100);
    expect(response.body.data.completedAt).toBeTruthy();
  });

  async function createStory(input: { title: string; status: StoryStatus }) {
    const readingLevel = await createReadingLevel(prisma, {
      code: input.title.replace(/\W/g, '').slice(0, 20),
    });

    return prisma.story.create({
      data: {
        title: input.title,
        slug: input.title.toLowerCase().replace(/\W+/g, '-'),
        readingLevelId: readingLevel.id,
        content: 'Once upon a time.',
        status: input.status,
        publishedAt: input.status === StoryStatus.published ? new Date() : null,
      },
    });
  }
});
