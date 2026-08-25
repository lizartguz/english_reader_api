# Fase 1 — Autenticación, seguridad y datos base

Registro de lo implementado en `english_reader_api` durante la primera fase y de
las decisiones que la planificación había dejado abiertas.

Los documentos de `docs/planning/` siguen siendo la referencia de diseño. Este
archivo no los reemplaza: complementa sus secciones de "Pendientes de definición"
con la decisión que finalmente se tomó y su motivo.

## Decisiones tomadas

### Stack y persistencia

| Pendiente            | Decisión                              | Motivo                                                                                                                                                          |
| -------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Elegir ORM final     | **Prisma 7.9**                        | Recomendado en `01-arquitectura-api.md` y `03-modelo-base-datos.md`: tipado con TypeScript, migraciones versionadas y soporte para MySQL, MariaDB y PostgreSQL. |
| Motor inicial exacto | **MariaDB 10.4** (XAMPP, puerto 3307) | Es el motor disponible en el entorno local descrito en `07-operacion-y-despliegue.md`.                                                                          |
| UUID o cuid          | **UUID v7**                           | Ordenado por tiempo, así que conserva la localidad de índice de un autoincremental sin exponer conteos.                                                         |
| Hash de contraseñas  | **Argon2id** vía `@node-rs/argon2`    | Recomendado en `02-seguridad-...`. Se usó el binding de Rust porque trae binarios precompilados y no exige herramientas de compilación nativas en Windows.      |

Prisma 7 exige un _driver adapter_, por lo que se añadió `@prisma/adapter-mariadb`.
El cliente se genera en `src/generated/prisma` con `moduleFormat = "cjs"` para que
sea compatible con la compilación CommonJS de NestJS.

### Contratos de API

| Pendiente             | Decisión                               | Motivo                                                                                                                                                                                                            |
| --------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Convención de nombres | **camelCase** en request y response    | `01-arquitectura-api.md` y `05-api-endpoints.md` se contradecían. camelCase evita mapeos manuales en TypeScript (React Admin) y Dart (Flutter). La base de datos conserva `snake_case` mediante `@map` de Prisma. |
| Formato de errores    | `{ success, message, code, errors[] }` | Se añadió `code` a lo previsto en la planificación: un identificador estable que los clientes pueden interpretar sin depender del texto del mensaje, que sí puede cambiar.                                        |

### Sesiones y tokens

| Pendiente                          | Decisión                                                                                   | Motivo                                                                                                                                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Refresh token en React Admin       | **Cookie `HttpOnly`** para `clientType: "web"`; cuerpo de la respuesta para `mobile`       | Elegido por el equipo. La cookie es inaccesible a JavaScript, lo que la protege frente a XSS.                                                                                                                                                            |
| Protección CSRF                    | **Doble envío de token**                                                                   | La cookie de sesión viaja sola en cada solicitud; se acompaña de una cookie CSRF legible que el cliente debe repetir en la cabecera `X-CSRF-Token`. Un sitio de terceros puede provocar la petición, pero no leer la cookie para reproducir la cabecera. |
| Duración de access y refresh token | Access **15 min**, refresh **30 días**, sesión administrativa con tope absoluto de **8 h** | El tope de 8 h lo fija `02-seguridad-...`. Se implementó con `session_id` + `session_expires_at`, de modo que rotar el refresh token no extiende el límite.                                                                                              |
| Bloqueo por intentos fallidos      | **5 intentos → 15 min de bloqueo**, configurable                                           | La planificación lo dejaba pendiente. Es un bloqueo temporal, no permanente, para no dejar fuera al usuario legítimo tras un ataque dirigido.                                                                                                            |
| Política de contraseñas            | Mínimo 8 caracteres con minúscula, mayúscula y número                                      | Equilibrio entre seguridad y fricción; centralizado en el decorador `@IsSecurePassword()`.                                                                                                                                                               |

### Registro de usuarios cliente

La planificación describía el login de `CLIENT` pero nunca su alta. Por decisión
del equipo se implementó **auto-registro con verificación de correo**:

- `POST /auth/register` crea la cuenta en `pending_verification` y asigna `CLIENT`
  en el servidor. El rol nunca se acepta desde el cliente.
- `POST /auth/verify-email` consume un token de un solo uso y activa la cuenta.
- `POST /auth/resend-verification` reenvía el enlace.

Esto obligó a una tabla nueva no prevista en `03-modelo-base-datos.md`:

```text
email_verification_tokens
```

Se mantuvo separada de `password_reset_tokens` para que las caducidades y las
políticas de reenvío de cada flujo evolucionen por su cuenta.

### Autorización

- La matriz de permisos vive en `src/common/constants/role-permissions.matrix.ts`
  y se siembra en base de datos. Una vez creada, los permisos se administran como
  datos desde el panel: los seeders no los recalculan ni revierten ajustes manuales.
- `SUPER_ADMIN` es rol raíz y no se evalúa contra la matriz.
- `ADMIN` recibe 35 de los 41 permisos. Quedan fuera: `users.manage_admins`,
  `roles.create`, `roles.update`, `roles.delete`, `audit.read` y `system_logs.read`.
- Se interpretó `roles.assign` como _asignar roles a usuarios_ (sí lo tiene `ADMIN`),
  distinto de administrar la definición de los roles y su matriz de permisos
  (reservado a `SUPER_ADMIN`). Sin esa distinción, un `ADMIN` no podría dar de
  alta usuarios cliente.

### Auditoría

Se audita el **inicio y cierre de sesión administrativo**, no el de clientes: los
accesos de la app son rutinarios y saturarían `audit_logs` sin aportar trazabilidad.
También se auditan solicitud y finalización de recuperación de contraseña y el
cambio de contraseña propio.

### Plantillas de correo

Los correos transaccionales usan plantillas HTML reutilizables con ancho estándar
de **600 px**, estructura basada en tablas, estilos en línea y `viewport`
responsive para que se adapten a móvil y escritorio.

Plantillas disponibles:

- recuperación de contraseña con botón, enlace alternativo y vencimiento;
- confirmación de contraseña actualizada después de restablecimiento por enlace;
- confirmación de contraseña actualizada después de cambio autenticado;
- confirmación de correo con el mismo layout base.

Cada plantilla genera también versión `text/plain`. Los valores dinámicos se
escapan antes de insertarse en HTML para evitar inyección de contenido.

## Endpoints disponibles

```text
GET  /api/v1/health

POST /api/v1/auth/register              público
POST /api/v1/auth/verify-email          público
POST /api/v1/auth/resend-verification   público
POST /api/v1/auth/login                 público
POST /api/v1/auth/refresh               público (usa refresh token)
POST /api/v1/auth/logout                público (tolerante)
GET  /api/v1/auth/verify-session        autenticado
GET  /api/v1/auth/me                    autenticado
POST /api/v1/auth/forgot-password       público
POST /api/v1/auth/reset-password        público
POST /api/v1/auth/change-password       autenticado
```

Documentación OpenAPI en `http://localhost:3000/api/docs`.

## Notas de integración para los otros proyectos

### `english_reader_admin` (React)

- Enviar `clientType: "web"` en `login`, `refresh` y `logout`.
- Hacer todas las peticiones con `credentials: "include"`.
- Leer la cookie `er_csrf_token` y reenviarla en la cabecera `X-CSRF-Token` en
  `refresh` y `logout`. Sin ella la API responde 401.
- El `refreshToken` **no** viene en el cuerpo: no hay nada que guardar en
  `localStorage`. Solo el `accessToken` se mantiene en memoria.
- `data.user.permissions` trae los permisos efectivos, útiles para ocultar menús.
  La API los valida igual en cada solicitud.
- Ante `code: "session_expired"` o `"session_invalidated"`, limpiar el estado y
  redirigir al login.

### `english_reader_app` (Flutter)

- Enviar `clientType: "mobile"` y el objeto `device` en el login:
  `deviceId`, `platform`, `appVersion`, `deviceName` (opcional).
- El `refreshToken` llega en `data.refreshToken`; guardarlo en almacenamiento
  seguro del dispositivo.
- Llamar `GET /auth/verify-session` al abrir la app. Si responde 401 con
  `code: "session_invalidated"`, limpiar la sesión local y mostrar:
  _"Tu sesión fue cerrada porque se inició en otro dispositivo."_
- Un `CLIENT` solo puede tener una sesión activa: el login desde otro dispositivo
  invalida el anterior de inmediato, no al expirar el token.
- `code: "email_not_verified"` en el login indica que la cuenta existe pero falta
  confirmar el correo: ofrecer el botón de reenvío.

## Estado de la base de datos

19 tablas creadas mediante dos migraciones versionadas.

Datos semilla cargados por `npm run db:seed` (idempotente):

- 41 permisos y 3 roles del sistema con su matriz inicial.
- 4 niveles de lectura: A1, A2, B1, B2.
- Usuario `SUPER_ADMIN` y usuario `ADMIN`, con credenciales leídas de variables
  de entorno. Si no están definidas, el seeder omite la creación en lugar de
  inventar una contraseña previsible.
- 2 historias de prueba, una publicada y una en borrador, sin recursos asociados
  tal como pide la planificación.

## Cobertura de pruebas acumulada

- **70 pruebas unitarias**: normalización de palabras, paginación, saneamiento de
  metadata, duraciones, hashing de contraseñas y tokens, guard de permisos,
  casos de uso y plantillas de correo.
- **84 pruebas e2e** sobre base de datos separada (`english_reader_db_test`):
  login por rol y contexto, política de un dispositivo, rotación y detección de
  reutilización de refresh tokens, CSRF, bloqueo por intentos fallidos, registro,
  verificación de correo, recuperación y cambio de contraseña, auditoría,
  historias, diccionario, vocabulario, progreso y archivos protegidos.

## Continuidad de implementación

Los módulos posteriores a fase 1 se documentan en:

```text
02-diccionario-y-vocabulario-app.md
03-diccionario-y-traducciones-admin.md
04-historias-app-y-progreso-lectura.md
05-archivos-admin-y-operacion.md
```

La base operativa con `Dockerfile`, `docker-compose.yml` y `.dockerignore` queda
documentada en `05-archivos-admin-y-operacion.md` y relacionada con
`07-operacion-y-despliegue.md`.
