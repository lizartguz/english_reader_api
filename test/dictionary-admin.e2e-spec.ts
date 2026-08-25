import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/database/prisma.service';
import { PasswordHasherService } from '@/common/security/password-hasher.service';
import { ErrorCode } from '@/common/constants/error-codes.constants';
import { PartOfSpeech, ReviewStatus } from '@/common/enums/domain.enums';
import { RoleCode } from '@/common/enums/role-code.enum';
import {
  createE2eApp,
  createTestUser,
  loginAs,
  resetDatabase,
  seedAccessControl,
} from './helpers/e2e-app';

const WORDS_BASE = '/api/v1/admin/words';
const TRANSLATIONS_BASE = '/api/v1/admin/translations';

describe('Diccionario administrativo (e2e)', () => {
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
      email: 'admin-dictionary@test.local',
      roleCode: RoleCode.Admin,
    });
    const client = await createTestUser(prisma, passwordHasher, {
      email: 'client-dictionary@test.local',
      roleCode: RoleCode.Client,
    });

    adminToken = await loginAs(app, admin);
    clientToken = await loginAs(app, client);
  });

  it('permite crear, listar y consultar palabras manuales', async () => {
    const created = await request(app.getHttpServer())
      .post(WORDS_BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        word: 'Beautiful',
        definitionEn: 'Pleasing the senses or mind aesthetically.',
        partOfSpeech: PartOfSpeech.adjective,
        examples: [{ exampleText: 'She has a beautiful voice.' }],
        pronunciations: [{ phonetic: '/bjuːtɪfəl/' }],
        translations: [{ translation: 'hermoso' }],
      })
      .expect(201);

    expect(created.body.data.normalizedWord).toBe('beautiful');
    expect(created.body.data.reviewStatus).toBe(ReviewStatus.reviewed);
    expect(created.body.data.translations[0].translation).toBe('hermoso');

    const listed = await request(app.getHttpServer())
      .get(`${WORDS_BASE}?search=beaut&reviewStatus=${ReviewStatus.reviewed}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.data[0].translationsCount).toBe(1);

    const detail = await request(app.getHttpServer())
      .get(`${WORDS_BASE}/${created.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(detail.body.data.examples[0].exampleText).toBe('She has a beautiful voice.');
  });

  it('protege duplicados por palabra normalizada e idioma', async () => {
    await request(app.getHttpServer())
      .post(WORDS_BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ word: 'Beautiful', partOfSpeech: PartOfSpeech.adjective })
      .expect(201);

    const duplicate = await request(app.getHttpServer())
      .post(WORDS_BASE)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ word: 'beautiful.', partOfSpeech: PartOfSpeech.adjective })
      .expect(409);

    expect(duplicate.body.code).toBe(ErrorCode.Conflict);
  });

  it('permite actualizar y revisar palabras', async () => {
    const word = await prisma.wordEntry.create({
      data: {
        word: 'quick',
        normalizedWord: 'quick',
        language: 'en',
        definitionEn: 'Moving fast.',
        source: 'dictionaryapi.dev',
      },
    });

    const updated = await request(app.getHttpServer())
      .patch(`${WORDS_BASE}/${word.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ definitionEn: 'Moving fast or doing something in a short time.' })
      .expect(200);

    expect(updated.body.data.definitionEn).toContain('short time');
    expect(updated.body.data.reviewedByUserId).toBeUndefined();

    const reviewed = await request(app.getHttpServer())
      .patch(`${WORDS_BASE}/${word.id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reviewStatus: ReviewStatus.reviewed })
      .expect(200);

    expect(reviewed.body.data.reviewStatus).toBe(ReviewStatus.reviewed);
  });

  it('permite administrar traducciones de una palabra', async () => {
    const word = await prisma.wordEntry.create({
      data: {
        word: 'kind',
        normalizedWord: 'kind',
        language: 'en',
        definitionEn: 'Friendly and generous.',
      },
    });

    const created = await request(app.getHttpServer())
      .post(`${WORDS_BASE}/${word.id}/translations`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ translation: 'amable', meaningContext: 'persona' })
      .expect(201);

    const translationId = created.body.data.id;
    expect(created.body.data.reviewStatus).toBe(ReviewStatus.reviewed);

    const listed = await request(app.getHttpServer())
      .get(`${WORDS_BASE}/${word.id}/translations`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(listed.body.data[0].translation).toBe('amable');

    const updated = await request(app.getHttpServer())
      .patch(`${TRANSLATIONS_BASE}/${translationId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ translation: 'bondadoso' })
      .expect(200);

    expect(updated.body.data.translation).toBe('bondadoso');

    const reviewed = await request(app.getHttpServer())
      .patch(`${TRANSLATIONS_BASE}/${translationId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reviewStatus: ReviewStatus.rejected })
      .expect(200);

    expect(reviewed.body.data.reviewStatus).toBe(ReviewStatus.rejected);

    await request(app.getHttpServer())
      .delete(`${TRANSLATIONS_BASE}/${translationId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const deleted = await prisma.wordTranslation.findUniqueOrThrow({
      where: { id: translationId },
    });
    expect(deleted.deletedAt).toBeTruthy();
  });

  it('bloquea a usuarios cliente en rutas administrativas', async () => {
    const response = await request(app.getHttpServer())
      .get(WORDS_BASE)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);

    expect(response.body.code).toBe(ErrorCode.Forbidden);
  });
});
