# Administración de diccionario y traducciones

Fecha de actualización: 2026-08-25

## Alcance implementado

Se implementaron los endpoints administrativos para que React Admin pueda
gestionar palabras y traducciones desde `english_reader_api`.

El flujo vigente permite:

- listar palabras con paginación y filtros;
- consultar el detalle de una palabra;
- crear palabras manuales con ejemplos, pronunciaciones y traducciones iniciales;
- editar datos base de una palabra;
- revisar palabras como `pending`, `reviewed` o `rejected`;
- eliminar lógicamente palabras;
- listar traducciones por palabra;
- crear traducciones manuales;
- editar traducciones;
- revisar traducciones como `pending`, `reviewed` o `rejected`;
- eliminar lógicamente traducciones.

## Endpoints disponibles

```text
GET    /api/v1/admin/words
GET    /api/v1/admin/words/:id
POST   /api/v1/admin/words
PATCH  /api/v1/admin/words/:id
PATCH  /api/v1/admin/words/:id/review
DELETE /api/v1/admin/words/:id

GET    /api/v1/admin/words/:wordId/translations
POST   /api/v1/admin/words/:wordId/translations
PATCH  /api/v1/admin/translations/:id
PATCH  /api/v1/admin/translations/:id/review
DELETE /api/v1/admin/translations/:id
```

Todos los endpoints están protegidos por autenticación JWT y restringidos a
`SUPER_ADMIN` o `ADMIN`.

## Permisos aplicados

```text
words.read
words.create
words.update
words.review
words.delete

translations.read
translations.create
translations.update
translations.review
translations.delete
```

## Reglas vigentes

La creación manual normaliza la palabra con las mismas reglas del lookup móvil.

La combinación `normalizedWord + language` se valida antes de crear para evitar
duplicados y respuestas SQL crudas. Si ya existe una palabra con esa combinación,
incluida una eliminada lógicamente, la API responde con conflicto controlado.

Las palabras creadas desde administración nacen como `reviewed`, porque son datos
manuales. Las traducciones creadas desde administración también nacen como
`reviewed`.

Al revisar una palabra o traducción:

- si el estado es `reviewed` o `rejected`, se guarda `reviewedByUserId` y
  `reviewedAt`;
- si el estado vuelve a `pending`, se limpian los datos de revisión.

La eliminación de palabras y traducciones es lógica mediante `deleted_at`.

## Trazabilidad

Las acciones administrativas registran auditoría:

```text
word.created
word.updated
word.reviewed
word.deleted
translation.created
translation.updated
translation.reviewed
translation.deleted
```

## Validación realizada

```text
npm run build
npm run test:e2e -- dictionary-admin.e2e-spec.ts
npm test
npm run test:e2e
```

Resultado:

```text
Build correcto.
65 pruebas unitarias correctas en el cierre inicial de este bloque.
72 pruebas e2e correctas.
```

## Continuidad relacionada

Los endpoints móviles de historias y progreso quedan documentados en
`docs/implementacion/04-historias-app-y-progreso-lectura.md`.
