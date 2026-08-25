# Archivos administrativos y cierre operativo

Fecha de actualización: 2026-08-25

## Alcance implementado

Se completó el bloque que faltaba alrededor de recursos de historias,
consultas administrativas de aprendizaje y preparación inicial para despliegue
contenedorizado.

El flujo vigente permite:

- cargar recursos de historias desde React Admin mediante `multipart/form-data`;
- almacenar archivos en disco local privado, fuera de rutas públicas;
- convertir portadas a WebP con redimensionado controlado;
- registrar metadatos de archivo sin exponer `storagePath` al cliente;
- descargar archivos mediante endpoint autenticado;
- impedir que clientes descarguen recursos de historias no publicadas;
- eliminar recursos con borrado lógico y retiro del archivo físico;
- auditar cargas y eliminaciones administrativas de recursos;
- consultar desde administración vocabulario guardado por clientes;
- consultar desde administración avances de lectura;
- preparar la API para build multi-stage con Docker y MariaDB en compose.

## Endpoints disponibles

```text
POST   /api/v1/admin/stories/:storyId/assets
GET    /api/v1/files/story-assets/:id
DELETE /api/v1/files/story-assets/:id

GET    /api/v1/admin/vocabulary
GET    /api/v1/admin/reading-progress
```

## Permisos y acceso

La carga de recursos requiere usuario `SUPER_ADMIN` o `ADMIN` con permiso
`files.upload`.

La eliminación requiere usuario `SUPER_ADMIN` o `ADMIN` con permiso
`files.delete`.

La descarga se resuelve con reglas por rol:

- `SUPER_ADMIN` puede descargar recursos protegidos;
- `ADMIN` necesita permiso `files.read`;
- `CLIENT` solo puede descargar recursos asociados a historias publicadas y no
  eliminadas.

Las consultas administrativas usan:

```text
vocabulary.read
reading_progress.read
```

## Carga de recursos

`POST /api/v1/admin/stories/:storyId/assets` recibe el archivo en el campo
`file`.

Campos de formulario:

```text
type: cover_image | audio | attachment
accessScope: private | public
sortOrder: número entero opcional
```

Reglas de almacenamiento:

- `cover_image` acepta `image/png`, `image/jpeg` e `image/webp`;
- las portadas se convierten a `image/webp`;
- el ancho máximo se toma de `IMAGE_MAX_WIDTH`;
- la calidad WebP se toma de `IMAGE_WEBP_QUALITY`;
- el tamaño máximo de imagen se toma de `MAX_IMAGE_SIZE_MB`;
- `audio` acepta `audio/mpeg`, `audio/mp4`, `audio/m4a` y `audio/x-m4a`;
- el tamaño máximo de audio se toma de `MAX_AUDIO_SIZE_MB`;
- `attachment` acepta `application/pdf` y `text/plain`;
- los archivos se guardan bajo `STORAGE_PRIVATE_PATH`.

Las respuestas devuelven metadatos seguros del recurso y `downloadUrl`; no se
devuelve la ruta interna del servidor.

## Consultas administrativas de aprendizaje

`GET /api/v1/admin/vocabulary` permite filtrar vocabulario guardado por:

```text
userId
storyId
status
page
limit
sort
order
```

`GET /api/v1/admin/reading-progress` permite filtrar progreso de lectura por:

```text
userId
storyId
completed
page
limit
sort
order
```

Ambos endpoints devuelven respuesta paginada estándar para consumo posterior
desde React Admin.

## Operación y despliegue

Se agregaron archivos base de operación:

```text
Dockerfile
docker-compose.yml
.dockerignore
```

El `Dockerfile` usa build multi-stage con Node.js 22, genera Prisma, compila
NestJS y ejecuta el runtime con usuario no root.

`docker-compose.yml` define:

- servicio `api` expuesto en el puerto `3000`;
- servicio `mariadb` basado en `mariadb:11.4`;
- volumen persistente para base de datos;
- volumen persistente para `STORAGE_PRIVATE_PATH`;
- healthcheck de MariaDB antes de iniciar la API.

Los secretos del compose son valores de desarrollo/base y deben reemplazarse en
staging o producción. El archivo `.env` real no se copia a la imagen.

## Validación realizada

```text
npm run build
npm test
npm run test:e2e -- admin-learning-data.e2e-spec.ts
npm run test:e2e -- files.e2e-spec.ts
npm run test:e2e
```

Resultado inicial:

```text
Build correcto.
70 pruebas unitarias correctas.
3 pruebas e2e administrativas de aprendizaje correctas.
4 pruebas e2e de archivos correctas.
84 pruebas e2e correctas en la batería completa.
```

## Pendiente relacionado

Para cerrar completamente el backend antes de pasar a Flutter y React Admin
queda pendiente:

- revisión final de Swagger/contratos generados;
- decidir si se agregan scripts reales de backup/restauración;
- definir monitoreo y alertas del servidor final;
- reemplazar secretos de ejemplo antes de staging o producción.
