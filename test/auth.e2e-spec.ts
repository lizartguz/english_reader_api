import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '@/database/prisma.service';
import { PasswordHasherService } from '@/common/security/password-hasher.service';
import { TokenHasherService } from '@/common/security/token-hasher.service';
import { RoleCode } from '@/common/enums/role-code.enum';
import { UserStatus } from '@/common/enums/domain.enums';
import { ErrorCode } from '@/common/constants/error-codes.constants';
import { AuditAction } from '@/common/constants/audit-actions.constants';
import {
  createE2eApp,
  createTestUser,
  resetDatabase,
  seedAccessControl,
  type TestUser,
} from './helpers/e2e-app';

const BASE = '/api/v1/auth';

/** Extrae el valor de una cookie de las cabeceras `set-cookie`. */
function readCookie(headers: Record<string, unknown>, name: string): string | undefined {
  const raw = headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : [];
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));

  return match?.split(';')[0]?.split('=')[1];
}

describe('Autenticación (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwordHasher: PasswordHasherService;
  let tokenHasher: TokenHasherService;

  let admin: TestUser;
  let client: TestUser;

  beforeAll(async () => {
    const context = await createE2eApp();
    app = context.app;
    prisma = context.prisma;
    passwordHasher = context.passwordHasher;
    tokenHasher = app.get(TokenHasherService);
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await seedAccessControl(prisma);

    admin = await createTestUser(prisma, passwordHasher, {
      email: 'admin@test.local',
      roleCode: RoleCode.Admin,
    });

    client = await createTestUser(prisma, passwordHasher, {
      email: 'cliente@test.local',
      roleCode: RoleCode.Client,
    });
  });

  describe('POST /auth/login', () => {
    it('emite una sesión válida con credenciales correctas', async () => {
      const response = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: admin.email, password: admin.password, clientType: 'mobile' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.roles).toEqual([RoleCode.Admin]);
      expect(response.body.data.user.permissions.length).toBeGreaterThan(0);
    });

    it('nunca devuelve el hash de la contraseña', async () => {
      const response = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: admin.email, password: admin.password, clientType: 'mobile' })
        .expect(200);

      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
      expect(JSON.stringify(response.body)).not.toContain('$argon2');
    });

    it('usa el mismo mensaje para correo inexistente y contraseña incorrecta', async () => {
      const wrongPassword = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: admin.email, password: 'Incorrecta123', clientType: 'mobile' })
        .expect(401);

      const unknownEmail = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: 'nadie@test.local', password: 'Incorrecta123', clientType: 'mobile' })
        .expect(401);

      expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
      expect(wrongPassword.body.code).toBe(ErrorCode.InvalidCredentials);
    });

    it('entrega el refresh token en cookie HttpOnly para el panel web', async () => {
      const response = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: admin.email, password: admin.password, clientType: 'web' })
        .expect(200);

      const cookies = response.headers['set-cookie'] as unknown as string[];
      const refreshCookie = cookies.find((cookie) => cookie.startsWith('er_refresh_token='));

      expect(refreshCookie).toContain('HttpOnly');
      expect(response.body.data.refreshToken).toBeUndefined();
    });

    it('devuelve el refresh token en el cuerpo para clientes móviles', async () => {
      const response = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: client.email, password: client.password, clientType: 'mobile' })
        .expect(200);

      expect(response.body.data.refreshToken).toEqual(expect.any(String));
    });

    it('impide que un usuario CLIENT entre al panel administrativo', async () => {
      const response = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: client.email, password: client.password, clientType: 'web' })
        .expect(403);

      expect(response.body.code).toBe(ErrorCode.Forbidden);
    });

    it('rechaza una cuenta pendiente de confirmar su correo', async () => {
      const pending = await createTestUser(prisma, passwordHasher, {
        email: 'pendiente@test.local',
        roleCode: RoleCode.Client,
        status: UserStatus.pending_verification,
      });

      const response = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: pending.email, password: pending.password, clientType: 'mobile' })
        .expect(401);

      expect(response.body.code).toBe(ErrorCode.EmailNotVerified);
    });

    it('rechaza una cuenta bloqueada', async () => {
      const blocked = await createTestUser(prisma, passwordHasher, {
        email: 'bloqueado@test.local',
        roleCode: RoleCode.Client,
        status: UserStatus.blocked,
      });

      const response = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: blocked.email, password: blocked.password, clientType: 'mobile' })
        .expect(401);

      expect(response.body.code).toBe(ErrorCode.AccountBlocked);
    });

    it('bloquea la cuenta temporalmente tras superar los intentos fallidos', async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await request(app.getHttpServer())
          .post(`${BASE}/login`)
          .send({ email: client.email, password: 'Incorrecta123', clientType: 'mobile' })
          .expect(401);
      }

      const response = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: client.email, password: client.password, clientType: 'mobile' })
        .expect(401);

      expect(response.body.code).toBe(ErrorCode.AccountLocked);
    });

    it('audita el acceso administrativo pero no el de un cliente', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: admin.email, password: admin.password, clientType: 'web' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: client.email, password: client.password, clientType: 'mobile' })
        .expect(200);

      const logs = await prisma.auditLog.findMany({ where: { action: AuditAction.AuthLogin } });

      expect(logs).toHaveLength(1);
      expect(logs[0].actorUserId).toBe(admin.id);
    });
  });

  describe('Política de un dispositivo por usuario cliente', () => {
    it('invalida la sesión anterior cuando el cliente entra desde otro dispositivo', async () => {
      const deviceA = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({
          email: client.email,
          password: client.password,
          clientType: 'mobile',
          device: { deviceId: 'device-a', platform: 'android' },
        })
        .expect(200);

      await request(app.getHttpServer())
        .get(`${BASE}/verify-session`)
        .set('Authorization', `Bearer ${deviceA.body.data.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({
          email: client.email,
          password: client.password,
          clientType: 'mobile',
          device: { deviceId: 'device-b', platform: 'ios' },
        })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`${BASE}/verify-session`)
        .set('Authorization', `Bearer ${deviceA.body.data.accessToken}`)
        .expect(401);

      expect(response.body.code).toBe(ErrorCode.SessionInvalidated);
    });

    it('no aplica la política de dispositivo único a las cuentas administrativas', async () => {
      const first = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: admin.email, password: admin.password, clientType: 'mobile' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: admin.email, password: admin.password, clientType: 'mobile' })
        .expect(200);

      await request(app.getHttpServer())
        .get(`${BASE}/verify-session`)
        .set('Authorization', `Bearer ${first.body.data.accessToken}`)
        .expect(200);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rota el refresh token y deja de aceptar el anterior', async () => {
      const login = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: client.email, password: client.password, clientType: 'mobile' })
        .expect(200);

      const firstToken = login.body.data.refreshToken;

      const refreshed = await request(app.getHttpServer())
        .post(`${BASE}/refresh`)
        .send({ refreshToken: firstToken, clientType: 'mobile' })
        .expect(200);

      expect(refreshed.body.data.refreshToken).not.toBe(firstToken);

      const reuse = await request(app.getHttpServer())
        .post(`${BASE}/refresh`)
        .send({ refreshToken: firstToken, clientType: 'mobile' })
        .expect(401);

      expect(reuse.body.code).toBe(ErrorCode.SessionInvalidated);
    });

    it('cierra la sesión completa al detectar reutilización de un token', async () => {
      const login = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: client.email, password: client.password, clientType: 'mobile' })
        .expect(200);

      const refreshed = await request(app.getHttpServer())
        .post(`${BASE}/refresh`)
        .send({ refreshToken: login.body.data.refreshToken, clientType: 'mobile' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`${BASE}/refresh`)
        .send({ refreshToken: login.body.data.refreshToken, clientType: 'mobile' })
        .expect(401);

      // El token vigente también queda invalidado tras detectar la reutilización.
      await request(app.getHttpServer())
        .post(`${BASE}/refresh`)
        .send({ refreshToken: refreshed.body.data.refreshToken, clientType: 'mobile' })
        .expect(401);
    });

    it('detecta dos renovaciones simultáneas del mismo refresh token', async () => {
      const login = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: client.email, password: client.password, clientType: 'mobile' })
        .expect(200);

      const refreshToken = login.body.data.refreshToken as string;
      const attempts = await Promise.all([
        request(app.getHttpServer())
          .post(`${BASE}/refresh`)
          .send({ refreshToken, clientType: 'mobile' }),
        request(app.getHttpServer())
          .post(`${BASE}/refresh`)
          .send({ refreshToken, clientType: 'mobile' }),
      ]);

      expect(attempts.map((response) => response.status).sort()).toEqual([200, 401]);

      const successful = attempts.find((response) => response.status === 200);

      await request(app.getHttpServer())
        .post(`${BASE}/refresh`)
        .send({ refreshToken: successful?.body.data.refreshToken, clientType: 'mobile' })
        .expect(401);
    });

    it('exige la cabecera CSRF a los clientes web', async () => {
      const login = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: admin.email, password: admin.password, clientType: 'web' })
        .expect(200);

      const cookies = login.headers['set-cookie'] as unknown as string[];
      const csrfToken = readCookie(login.headers, 'er_csrf_token');

      await request(app.getHttpServer())
        .post(`${BASE}/refresh`)
        .set('Cookie', cookies)
        .send({ clientType: 'web' })
        .expect(401);

      await request(app.getHttpServer())
        .post(`${BASE}/refresh`)
        .set('Cookie', cookies)
        .set('X-CSRF-Token', csrfToken as string)
        .send({ clientType: 'web' })
        .expect(200);
    });

    it('rechaza un refresh token inexistente', async () => {
      const response = await request(app.getHttpServer())
        .post(`${BASE}/refresh`)
        .send({ refreshToken: 'token-inventado', clientType: 'mobile' })
        .expect(401);

      expect(response.body.code).toBe(ErrorCode.TokenInvalid);
    });
  });

  describe('POST /auth/logout', () => {
    it('invalida la sesión del refresh token recibido', async () => {
      const login = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: client.email, password: client.password, clientType: 'mobile' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`${BASE}/logout`)
        .send({ refreshToken: login.body.data.refreshToken, clientType: 'mobile' })
        .expect(200);

      await request(app.getHttpServer())
        .get(`${BASE}/verify-session`)
        .set('Authorization', `Bearer ${login.body.data.accessToken}`)
        .expect(401);
    });
  });

  describe('Rutas protegidas', () => {
    it('rechaza el acceso sin token', async () => {
      const response = await request(app.getHttpServer()).get(`${BASE}/me`).expect(401);

      expect(response.body.code).toBe(ErrorCode.Unauthenticated);
    });

    it('rechaza un token manipulado', async () => {
      const response = await request(app.getHttpServer())
        .get(`${BASE}/me`)
        .set('Authorization', 'Bearer token.no.valido')
        .expect(401);

      expect(response.body.code).toBe(ErrorCode.TokenInvalid);
    });

    it('devuelve el perfil con roles y permisos al usuario autenticado', async () => {
      const login = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: admin.email, password: admin.password, clientType: 'mobile' })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`${BASE}/me`)
        .set('Authorization', `Bearer ${login.body.data.accessToken}`)
        .expect(200);

      expect(response.body.data.email).toBe(admin.email);
      expect(response.body.data.roles).toEqual([RoleCode.Admin]);
    });
  });

  describe('Registro y verificación de correo', () => {
    it('crea la cuenta en estado pendiente con rol CLIENT', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/register`)
        .send({
          email: 'nuevo@test.local',
          password: 'Nuevo1234',
          firstName: 'Nuevo',
          lastName: 'Lector',
        })
        .expect(201);

      const created = await prisma.user.findUniqueOrThrow({
        where: { email: 'nuevo@test.local' },
        select: { status: true, roles: { select: { role: { select: { code: true } } } } },
      });

      expect(created.status).toBe(UserStatus.pending_verification);
      expect(created.roles.map((entry) => entry.role.code)).toEqual([RoleCode.Client]);
    });

    it('rechaza registrar un correo ya usado', async () => {
      const response = await request(app.getHttpServer())
        .post(`${BASE}/register`)
        .send({
          email: client.email,
          password: 'Nuevo1234',
          firstName: 'Otro',
          lastName: 'Lector',
        })
        .expect(409);

      expect(response.body.code).toBe(ErrorCode.Conflict);
    });

    it('valida la política de contraseñas', async () => {
      const response = await request(app.getHttpServer())
        .post(`${BASE}/register`)
        .send({
          email: 'debil@test.local',
          password: 'todominuscula',
          firstName: 'Débil',
          lastName: 'Clave',
        })
        .expect(400);

      expect(response.body.code).toBe(ErrorCode.ValidationFailed);
      expect(response.body.errors.some((e: { field: string }) => e.field === 'password')).toBe(
        true,
      );
    });

    it('rechaza un token de verificación inválido', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/verify-email`)
        .send({ token: 'token-inventado' })
        .expect(422);
    });

    it('no reactiva una cuenta bloqueada con un token de verificación vigente', async () => {
      const pending = await createTestUser(prisma, passwordHasher, {
        email: 'pendiente-bloqueado@test.local',
        roleCode: RoleCode.Client,
        status: UserStatus.pending_verification,
      });
      const token = tokenHasher.generate();

      await prisma.user.update({
        where: { id: pending.id },
        data: { status: UserStatus.blocked, emailVerifiedAt: null },
      });
      await prisma.emailVerificationToken.create({
        data: {
          userId: pending.id,
          email: pending.email,
          tokenHash: tokenHasher.hash(token),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      await request(app.getHttpServer())
        .post(`${BASE}/verify-email`)
        .send({ token })
        .expect(422);

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: pending.id },
        select: { status: true, emailVerifiedAt: true },
      });

      expect(user.status).toBe(UserStatus.blocked);
      expect(user.emailVerifiedAt).toBeNull();
    });
  });

  describe('Recuperación de contraseña', () => {
    it('responde igual exista o no el correo', async () => {
      const existing = await request(app.getHttpServer())
        .post(`${BASE}/forgot-password`)
        .send({ email: client.email })
        .expect(200);

      const unknown = await request(app.getHttpServer())
        .post(`${BASE}/forgot-password`)
        .send({ email: 'nadie@test.local' })
        .expect(200);

      expect(existing.body.message).toBe(unknown.body.message);
    });

    it('guarda el token de recuperación hasheado, nunca en claro', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/forgot-password`)
        .send({ email: client.email })
        .expect(200);

      const token = await prisma.passwordResetToken.findFirstOrThrow({
        where: { userId: client.id },
        select: { tokenHash: true },
      });

      // SHA-256 en hexadecimal ocupa 64 caracteres.
      expect(token.tokenHash).toHaveLength(64);
      expect(token.tokenHash).toMatch(/^[0-9a-f]+$/);
    });

    it('rechaza un token de recuperación inválido', async () => {
      await request(app.getHttpServer())
        .post(`${BASE}/reset-password`)
        .send({ token: 'token-inventado', password: 'NuevaClave123' })
        .expect(422);
    });
  });

  describe('Cambio de contraseña', () => {
    it('cierra las demás sesiones y conserva la actual', async () => {
      const otherDevice = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: admin.email, password: admin.password, clientType: 'mobile' })
        .expect(200);

      const currentDevice = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: admin.email, password: admin.password, clientType: 'mobile' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`${BASE}/change-password`)
        .set('Authorization', `Bearer ${currentDevice.body.data.accessToken}`)
        .send({ currentPassword: admin.password, newPassword: 'NuevaClave123' })
        .expect(200);

      await request(app.getHttpServer())
        .get(`${BASE}/verify-session`)
        .set('Authorization', `Bearer ${currentDevice.body.data.accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`${BASE}/verify-session`)
        .set('Authorization', `Bearer ${otherDevice.body.data.accessToken}`)
        .expect(401);

      await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: admin.email, password: 'NuevaClave123', clientType: 'mobile' })
        .expect(200);
    });

    it('rechaza el cambio si la contraseña actual no coincide', async () => {
      const login = await request(app.getHttpServer())
        .post(`${BASE}/login`)
        .send({ email: admin.email, password: admin.password, clientType: 'mobile' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`${BASE}/change-password`)
        .set('Authorization', `Bearer ${login.body.data.accessToken}`)
        .send({ currentPassword: 'Incorrecta123', newPassword: 'NuevaClave123' })
        .expect(422);
    });
  });
});
