import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/database/prisma.service';
import { PasswordHasherService } from '@/common/security/password-hasher.service';
import { ErrorCode } from '@/common/constants/error-codes.constants';
import { PartOfSpeech, SavedWordStatus, StoryStatus } from '@/common/enums/domain.enums';
import { RoleCode } from '@/common/enums/role-code.enum';
import {
  createE2eApp,
  createReadingLevel,
  createTestUser,
  loginAs,
  resetDatabase,
  seedAccessControl,
  type TestUser,
} from './helpers/e2e-app';

describe('Datos de aprendizaje administrativos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwordHasher: PasswordHasherService;
  let adminToken: string;
  let clientToken: string;
  let client: TestUser;

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
      email: 'learning-admin@test.local',
      roleCode: RoleCode.Admin,
    });
    client = await createTestUser(prisma, passwordHasher, {
      email: 'learning-client@test.local',
      roleCode: RoleCode.Client,
    });

    adminToken = await loginAs(app, admin);
    clientToken = await loginAs(app, client);
  });

  it('lista vocabulario de clientes con datos del usuario dueño', async () => {
    const { word, story } = await createLearningData();
    await prisma.userSavedWord.create({
      data: {
        userId: client.id,
        wordEntryId: word.id,
        storyId: story.id,
        status: SavedWordStatus.learning,
      },
    });

    const response = await request(app.getHttpServer())
      .get(`/api/v1/admin/vocabulary?userId=${client.id}&status=${SavedWordStatus.learning}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].user.email).toBe(client.email);
    expect(response.body.data[0].word.normalizedWord).toBe('brave');
  });

  it('lista progreso de lectura con filtros administrativos', async () => {
    const { story } = await createLearningData();
    await prisma.readingProgress.create({
      data: {
        userId: client.id,
        storyId: story.id,
        progressPercent: 100,
        completedAt: new Date(),
        lastReadAt: new Date(),
      },
    });

    const response = await request(app.getHttpServer())
      .get(`/api/v1/admin/reading-progress?completed=true&search=learning-client`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].user.email).toBe(client.email);
    expect(response.body.data[0].story.id).toBe(story.id);
    expect(response.body.data[0].progressPercent).toBe(100);
  });

  it('bloquea a clientes en consultas administrativas de aprendizaje', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/vocabulary')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);

    expect(response.body.code).toBe(ErrorCode.Forbidden);
  });

  async function createLearningData() {
    const readingLevel = await createReadingLevel(prisma, { code: 'LEARN' });
    const story = await prisma.story.create({
      data: {
        title: 'Learning Story',
        slug: 'learning-story',
        readingLevelId: readingLevel.id,
        content: 'Once upon a time.',
        status: StoryStatus.published,
        publishedAt: new Date(),
      },
    });
    const word = await prisma.wordEntry.create({
      data: {
        word: 'brave',
        normalizedWord: 'brave',
        language: 'en',
        partOfSpeech: PartOfSpeech.adjective,
        translations: { create: { targetLanguage: 'es', translation: 'valiente' } },
      },
    });

    return { story, word };
  }
});
