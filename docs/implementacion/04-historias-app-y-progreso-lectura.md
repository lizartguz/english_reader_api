# Historias móviles y progreso de lectura

Fecha de actualización: 2026-08-25

## Alcance implementado

Se implementaron los endpoints de lectura que Flutter necesita después de
autenticación, diccionario y vocabulario.

El flujo vigente permite:

- listar historias publicadas para clientes;
- consultar el detalle completo de una historia publicada;
- incluir recursos asociados vigentes en las respuestas móviles;
- bloquear historias en borrador, archivadas o eliminadas para Flutter;
- guardar avance de lectura por usuario e historia;
- consultar el avance guardado por el usuario autenticado;
- mantener un único registro de progreso por usuario e historia.

## Endpoints disponibles

```text
GET   /api/v1/app/stories
GET   /api/v1/app/stories/:id

GET   /api/v1/app/reading-progress/:storyId
PATCH /api/v1/app/reading-progress/:storyId
```

Todos los endpoints están protegidos por autenticación JWT y restringidos al rol
`CLIENT`.

## Historias para Flutter

`GET /api/v1/app/stories` devuelve únicamente historias con estado `published`,
sin contenido completo para mantener el listado liviano.

Filtros disponibles:

```text
search
readingLevelId
genreId
page
limit
sort
order
```

`GET /api/v1/app/stories/:id` devuelve el contenido completo de lectura solo si
la historia está publicada.

Las respuestas incluyen:

- datos principales de la historia;
- nivel de lectura;
- géneros;
- recursos asociados vigentes (`story_assets`) con tipo, metadatos, peso y
  alcance de acceso.

La entrega binaria de archivos protegidos se documenta en
`05-archivos-admin-y-operacion.md`.

## Progreso de lectura

`PATCH /api/v1/app/reading-progress/:storyId` crea o actualiza el progreso del
usuario autenticado.

Campos aceptados:

```text
progressPercent: número entre 0 y 100
lastPosition: string opcional
completed: boolean opcional
```

Reglas vigentes:

- si `completed` es `true`, el progreso se guarda como `100`;
- si `progressPercent` llega a `100`, se marca `completedAt`;
- si `completed` es `false` o el porcentaje baja de `100`, se limpia
  `completedAt`;
- cada sincronización actualiza `lastReadAt`;
- cada usuario solo puede ver o modificar su propio progreso;
- no se puede registrar progreso sobre historias no publicadas.

`GET /api/v1/app/reading-progress/:storyId` devuelve el progreso existente del
usuario autenticado. Si no existe progreso para ese usuario e historia, responde
con error controlado de no encontrado.

## Validación realizada

```text
npm run build
npm run test:e2e -- app-reading.e2e-spec.ts
npm test
npm run test:e2e
```

Resultado:

```text
Build correcto.
65 pruebas unitarias correctas en el cierre inicial de este bloque.
77 pruebas e2e correctas en el cierre inicial de este bloque.
```

## Continuidad relacionada

El bloque siguiente de implementación queda documentado en
`05-archivos-admin-y-operacion.md` e incluye archivos protegidos, consultas
administrativas de aprendizaje y preparación operativa con Docker.
