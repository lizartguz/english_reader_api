import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { INestApplication } from '@nestjs/common';
import sharp from 'sharp';
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

const ADMIN_ASSETS_BASE = '/api/v1/admin/stories';
const FILES_BASE = '/api/v1/files/story-assets';

describe('Archivos de historias (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwordHasher: PasswordHasherService;
  let adminToken: string;
  let clientToken: string;
  let pngFixture: Buffer;
  let pdfFixture: Buffer;

  beforeAll(async () => {
    const context = await createE2eApp();
    app = context.app;
    prisma = context.prisma;
    passwordHasher = context.passwordHasher;
    pngFixture = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 4,
        background: '#ffffff',
      },
    })
      .png()
      .toBuffer();
    pdfFixture = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF', 'utf8');
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await rm(resolve('./storage/private/story-assets'), { recursive: true, force: true });
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await seedAccessControl(prisma);

    const admin = await createTestUser(prisma, passwordHasher, {
      email: 'files-admin@test.local',
      roleCode: RoleCode.Admin,
    });
    const client = await createTestUser(prisma, passwordHasher, {
      email: 'files-client@test.local',
      roleCode: RoleCode.Client,
    });

    adminToken = await loginAs(app, admin);
    clientToken = await loginAs(app, client);
  });

  it('carga una portada, la registra sin exponer storagePath y permite descargarla', async () => {
    const story = await createStory(StoryStatus.published);

    const uploaded = await request(app.getHttpServer())
      .post(`${ADMIN_ASSETS_BASE}/${story.id}/assets`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('type', StoryAssetType.cover_image)
      .field('accessScope', FileAccessScope.private)
      .attach('file', pngFixture, { filename: 'cover.png', contentType: 'image/png' })
      .expect(201);

    expect(uploaded.body.data).toMatchObject({
      storyId: story.id,
      type: StoryAssetType.cover_image,
      mimeType: 'image/webp',
      originalFileName: 'cover.png',
    });
    expect(uploaded.body.data.storagePath).toBeUndefined();
    expect(uploaded.body.data.downloadUrl).toBe(`${FILES_BASE}/${uploaded.body.data.id}`);

    const stored = await prisma.storyAsset.findUniqueOrThrow({
      where: { id: uploaded.body.data.id },
    });
    expect(stored.storagePath).toContain(`story-assets/${story.id}`);

    const downloaded = await request(app.getHttpServer())
      .get(`${FILES_BASE}/${uploaded.body.data.id}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    expect(downloaded.headers['content-type']).toContain('image/webp');
    expect(downloaded.headers['x-content-type-options']).toBe('nosniff');
    expect(downloaded.headers['content-disposition']).toContain('inline');
    expect(downloaded.body.length).toBeGreaterThan(0);
  });

  it('bloquea subida desde cliente y formatos no permitidos', async () => {
    const story = await createStory(StoryStatus.published);

    await request(app.getHttpServer())
      .post(`${ADMIN_ASSETS_BASE}/${story.id}/assets`)
      .set('Authorization', `Bearer ${clientToken}`)
      .field('type', StoryAssetType.cover_image)
      .attach('file', pngFixture, { filename: 'cover.png', contentType: 'image/png' })
      .expect(403);

    const unsupported = await request(app.getHttpServer())
      .post(`${ADMIN_ASSETS_BASE}/${story.id}/assets`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('type', StoryAssetType.cover_image)
      .attach('file', Buffer.from('not an image'), {
        filename: 'cover.txt',
        contentType: 'text/plain',
      })
      .expect(400);

    expect(unsupported.body.code).toBe(ErrorCode.ValidationFailed);
  });

  it('rechaza adjuntos con MIME declarado pero contenido incompatible', async () => {
    const story = await createStory(StoryStatus.published);

    const response = await request(app.getHttpServer())
      .post(`${ADMIN_ASSETS_BASE}/${story.id}/assets`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('type', StoryAssetType.attachment)
      .attach('file', Buffer.from('MZ executable content'), {
        filename: 'manual.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);

    expect(response.body.code).toBe(ErrorCode.ValidationFailed);
  });

  it('sirve adjuntos como descarga y fuerza nosniff', async () => {
    const story = await createStory(StoryStatus.published);

    const uploaded = await request(app.getHttpServer())
      .post(`${ADMIN_ASSETS_BASE}/${story.id}/assets`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('type', StoryAssetType.attachment)
      .attach('file', pdfFixture, { filename: 'manual.pdf', contentType: 'application/pdf' })
      .expect(201);

    const downloaded = await request(app.getHttpServer())
      .get(`${FILES_BASE}/${uploaded.body.data.id}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    expect(downloaded.headers['content-type']).toContain('application/pdf');
    expect(downloaded.headers['x-content-type-options']).toBe('nosniff');
    expect(downloaded.headers['content-disposition']).toContain('attachment');
  });

  it('no permite a clientes descargar recursos de historias no publicadas', async () => {
    const story = await createStory(StoryStatus.draft);
    const asset = await prisma.storyAsset.create({
      data: {
        storyId: story.id,
        type: StoryAssetType.attachment,
        storageDisk: 'local',
        storagePath: 'story-assets/manual/missing.pdf',
        originalFileName: 'missing.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 10,
      },
    });

    const response = await request(app.getHttpServer())
      .get(`${FILES_BASE}/${asset.id}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);

    expect(response.body.code).toBe(ErrorCode.Forbidden);
  });

  it('elimina lógicamente un recurso desde administración', async () => {
    const story = await createStory(StoryStatus.published);
    const uploaded = await request(app.getHttpServer())
      .post(`${ADMIN_ASSETS_BASE}/${story.id}/assets`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('type', StoryAssetType.cover_image)
      .attach('file', pngFixture, { filename: 'cover.png', contentType: 'image/png' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`${FILES_BASE}/${uploaded.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const deleted = await prisma.storyAsset.findUniqueOrThrow({
      where: { id: uploaded.body.data.id },
    });
    expect(deleted.deletedAt).toBeTruthy();
  });

  async function createStory(status: StoryStatus) {
    const readingLevel = await createReadingLevel(prisma, {
      code: `FILE${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    });

    return prisma.story.create({
      data: {
        title: `Story ${Math.random().toString(36).slice(2)}`,
        slug: `story-${Math.random().toString(36).slice(2)}`,
        readingLevelId: readingLevel.id,
        content: 'Once upon a time.',
        status,
        publishedAt: status === StoryStatus.published ? new Date() : null,
      },
    });
  }
});
