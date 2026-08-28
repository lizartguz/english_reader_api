# English Reader API

Backend NestJS del ecosistema English Reader. Concentra reglas de negocio,
seguridad, persistencia e integraciones externas para los otros dos proyectos:

```text
english_reader_api    -> este proyecto: API, seguridad y datos
english_reader_admin  -> panel administrativo en React
english_reader_app    -> aplicación de lectura en Flutter
```

La planificación técnica vive en [`docs/planning/`](docs/planning/00-indice-planificacion.md)
y el registro de lo implementado en [`docs/implementacion/`](docs/implementacion/01-fase-1-autenticacion-y-seguridad.md).

## Requisitos

- Node.js 20.19+ (probado con 24.16 y runtime Docker Node 22)
- MySQL 8 o MariaDB 10.4+

## Puesta en marcha

```bash
npm install
cp .env.example .env          # completar valores; generar secretos JWT propios
npx prisma migrate deploy     # crear el esquema
npm run db:seed               # roles, permisos, niveles, usuarios y historias base
npm run start:dev
```

La API queda en `http://localhost:3000/api/v1` y la documentación OpenAPI en
`http://localhost:3000/api/docs`.

Para validar Flutter Web con Playwright desde `english_reader_app`, el origen
local `http://localhost:53633` debe estar incluido en `CORS_ORIGINS`.

Para generar secretos JWT:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Scripts

| Script                   | Descripción                                                  |
| ------------------------ | ------------------------------------------------------------ |
| `npm run start:dev`      | Servidor con recarga automática.                             |
| `npm run build`          | Compila a `dist/` y resuelve los alias de rutas.             |
| `npm run start:prod`     | Ejecuta la compilación de producción.                        |
| `npm test`               | Pruebas unitarias.                                           |
| `npm run test:e2e`       | Prepara la base de pruebas y ejecuta las pruebas end to end. |
| `npm run lint`           | ESLint con corrección automática.                            |
| `npm run prisma:migrate` | Crea y aplica una migración en desarrollo.                   |
| `npm run prisma:deploy`  | Aplica migraciones existentes (staging/producción).          |
| `npm run db:seed`        | Carga los datos semilla. Es idempotente.                     |
| `npm run db:fresh`       | Recrea la base y vuelve a sembrar. **Solo en desarrollo.**   |
| `npm run prisma:studio`  | Explorador visual de la base de datos.                       |

## Docker

El proyecto incluye una base operativa con `Dockerfile`, `docker-compose.yml` y
`.dockerignore`.

```bash
docker compose up --build
```

El compose levanta:

- `api` en `http://localhost:3000`;
- `mariadb` en el puerto host `3307`;
- volumen persistente para MariaDB;
- volumen persistente para archivos privados en `/app/storage/private`.

Antes de usar staging o producción, reemplazar secretos y credenciales del
compose/.env por valores propios del servidor.

## Estructura

```text
prisma/
  schema.prisma           modelo de datos y enumeraciones
  migrations/             migraciones versionadas

src/
  main.ts                 arranque, CORS, Swagger, cookies
  app.module.ts           módulo raíz y seguridad transversal

  config/                 configuración por ambiente y validación de entorno
  database/
    prisma.service.ts     cliente y ayuda para transacciones
    seeds/                datos semilla

  common/
    constants/            mensajes, códigos de error, permisos, auditoría
    decorators/           @Public, @CurrentUser, @RequirePermissions, @RequireRoles
    dto/                  envoltura de respuesta y paginación
    enums/                enumeraciones de dominio y de acceso
    exceptions/           AppException y sus constructores
    filters/              filtro global de excepciones
    guards/               guards de rol y de permisos
    interceptors/         envoltura estándar de respuesta
    pipes/                fábrica de errores de validación
    security/             hashing de contraseñas y de tokens
    utils/                paginación, normalización, saneamiento, fechas

  modules/
    auth/                 autenticación, sesiones, recuperación, verificación
    users/                gestión administrativa de usuarios
    roles/                roles, permisos y matriz de acceso
    reading-levels/       niveles de lectura
    genres/               géneros literarios
    stories/              historias, publicación y lectura móvil
    dictionary/           lookup, caché y proveedores externos
    vocabulary/           vocabulario personal y consulta administrativa
    reading-progress/     progreso de lectura móvil y administrativo
    files/                carga y entrega protegida de recursos
    audit/                auditoría funcional
    system-logs/          registro técnico
    mail/                 correos transaccionales
    health/               estado de la API
```

Cada módulo principal se organiza en capas: `domain`, `application`
(`dto`, `services`, `use-cases`), `infrastructure` y `presentation/http`.

## Convenciones

- **Respuestas**: siempre `{ success, message, data, meta }` en éxito y
  `{ success, message, code, errors }` en error.
- **Nombres de campos**: `camelCase` en la API, `snake_case` en la base de datos.
- **Mensajes**: en español, amigables y sin detalle técnico. Los códigos de error
  (`code`) son estables y sirven para que los clientes reaccionen de forma
  programática.
- **Comentarios**: TSDoc en español sobre clases, casos de uso, guards y lógica
  no evidente, según [`docs/planning/08-estandares-codigo.md`](docs/planning/08-estandares-codigo.md).
- **Sin strings sueltos**: roles, permisos, estados, mensajes y códigos viven en
  enums o catálogos de `src/common`.

## Base de datos

Motor inicial MySQL/MariaDB mediante Prisma con `@prisma/adapter-mariadb`.
El esquema evita dependencias exclusivas del motor para dejar abierta una
migración futura a PostgreSQL.

Configuración local por defecto:

```text
DATABASE_URL="mysql://root:@localhost:3307/english_reader_db"
```

En desarrollo la base puede recrearse libremente con `npm run db:fresh`. Esa
libertad **no aplica** a staging ni a producción.

## Pruebas

Las pruebas end to end usan una base separada, `english_reader_db_test`, que se
crea y migra automáticamente:

```bash
npm run test:e2e
```

La configuración se lee de `.env.test`.

Estado validado:

```text
npm run build
npm test
npm run test:e2e
```

Resultado actual: 70 pruebas unitarias y 84 pruebas end to end correctas.
