# Diccionario y vocabulario de la app

Fecha de actualización: 2026-08-25

## Alcance implementado

Se implementó el bloque de consulta de palabras y vocabulario personal para la
aplicación Flutter dentro de `english_reader_api`.

El flujo vigente permite:

- consultar una palabra desde la app móvil;
- normalizar la palabra antes de buscarla;
- responder desde caché local cuando ya existe;
- consultar `dictionaryapi.dev` cuando la palabra no existe en base de datos;
- guardar definición, ejemplos, pronunciaciones y fuente del dato;
- intentar traducir la palabra al español mediante LibreTranslate;
- conservar datos parciales si la traducción falla;
- guardar, listar, actualizar y eliminar lógicamente palabras del vocabulario
  personal del usuario cliente.

## Endpoints disponibles

```text
GET    /api/v1/app/words/lookup
GET    /api/v1/app/vocabulary
POST   /api/v1/app/vocabulary
PATCH  /api/v1/app/vocabulary/:id
DELETE /api/v1/app/vocabulary/:id
```

Todos los endpoints están protegidos por autenticación JWT y restringidos al rol
`CLIENT`.

## Consulta de palabras

El endpoint `GET /api/v1/app/words/lookup` recibe:

```text
word: string
language: en
targetLanguage: es
```

La normalización se realiza con `normalizeWord()` y se valida con
`isLookupableWord()`.

La respuesta incluye:

- datos base de la palabra;
- definición en inglés;
- tipo gramatical;
- traducciones disponibles;
- ejemplos;
- pronunciaciones y audio remoto cuando existe;
- estado de revisión;
- `isSaved` y `savedWordId` para que Flutter sepa si la palabra ya pertenece al
  vocabulario del usuario.

Las traducciones revisadas por administración se ordenan primero al construir la
respuesta.

## Proveedores externos

El adaptador `DictionaryApiProvider` encapsula el consumo de `dictionaryapi.dev`.

Cuando el proveedor responde 404, la API devuelve un error controlado de palabra
no encontrada. Cuando ocurre un fallo técnico o timeout, la API registra el fallo
en `system_logs` con origen `dictionary_provider` y responde con mensaje
amigable.

El adaptador `LibreTranslateProvider` intenta traducir la palabra al español. Si
falla, el flujo no se aborta: la palabra se guarda con definición, ejemplos y
pronunciaciones disponibles, y el fallo se registra en `system_logs` con origen
`translation_provider`.

## Vocabulario personal

El endpoint `POST /api/v1/app/vocabulary` recibe:

```text
wordEntryId: uuid
storyId: uuid opcional
notes: string opcional
```

Reglas vigentes:

- un usuario no puede duplicar una palabra en su vocabulario;
- si la palabra ya está guardada, se devuelve el registro existente;
- si la palabra estaba eliminada lógicamente, se reactiva;
- si se envía `storyId`, la historia debe existir, estar vigente y publicada;
- la eliminación es lógica mediante `deleted_at`.

El endpoint `PATCH /api/v1/app/vocabulary/:id` permite actualizar:

```text
status: saved | learning | learned | archived
notes: string opcional
```

Al cambiar el estado se actualiza `lastReviewedAt`.

## Validación realizada

```text
npm run build
npm test -- lookup-word.use-case.spec.ts vocabulary.use-cases.spec.ts
npm test
```

Resultado:

```text
Build correcto.
9 suites unitarias correctas.
65 pruebas unitarias correctas en el cierre inicial de este bloque.
```

## Validación cruzada con Readeriz

El contrato de diccionario y vocabulario se validó desde Flutter con
`dart run tool/verify_real_api_flow.dart` en `english_reader_app`.

Flujo cubierto:

```text
GET  /api/v1/app/words/lookup?word=hello
POST /api/v1/app/vocabulary
```

Resultado vigente:

```text
La API devuelve la palabra consultada, permite guardar vocabulario y responde
con mensaje idempotente cuando la palabra ya está guardada.
```

## Continuidad relacionada

La administración de palabras y traducciones queda documentada en
`docs/implementacion/03-diccionario-y-traducciones-admin.md`.
