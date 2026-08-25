# Modelo de base de datos - English Reader API

## Objetivo

Este documento define el modelo inicial de base de datos para `english_reader_api`.

Incluye tablas propuestas, relaciones, campos principales, índices, criterios de auditoría, soft delete y compatibilidad con MySQL/MariaDB, manteniendo apertura futura a PostgreSQL.

No define formularios del panel, pantallas Flutter ni reglas detalladas de negocio. Esos temas pertenecen a otros documentos.

## Ecosistema relacionado

English Reader está compuesto por tres proyectos:

```text
english_reader_api    -> NestJS: administra persistencia, reglas, seguridad e integraciones.
english_reader_admin  -> React: consume datos administrativos mediante la API.
english_reader_app    -> Flutter: consume historias, palabras, vocabulario y progreso mediante la API.
```

Todo cambio en tablas, campos o relaciones puede impactar contratos de API y modelos usados por React Admin y Flutter.

## Resumen de tablas propuestas

| Tabla                   | Descripción                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `users`                 | Almacena usuarios del sistema, tanto administrativos como clientes de la app Flutter.                    |
| `roles`                 | Define los roles disponibles, como SUPER_ADMIN, ADMIN y CLIENT.                                          |
| `permissions`           | Define acciones permitidas sobre módulos o recursos del sistema.                                         |
| `user_roles`            | Relaciona usuarios con uno o más roles.                                                                  |
| `role_permissions`      | Relaciona roles con permisos específicos.                                                                |
| `refresh_tokens`        | Guarda sesiones renovables para mantener autenticación segura.                                           |
| `password_reset_tokens` | Guarda tokens temporales para recuperación segura de contraseña.                                         |
| `reading_levels`        | Define niveles de lectura, por ejemplo A1, A2, B1 y B2.                                                  |
| `stories`               | Almacena cuentos, historias y lecturas en inglés.                                                        |
| `story_assets`          | Guarda recursos asociados a historias, como imágenes, audios o adjuntos.                                 |
| `word_entries`          | Guarda palabras consultadas, normalizadas y enriquecidas con información del diccionario.                |
| `word_examples`         | Guarda ejemplos de uso asociados a una palabra.                                                          |
| `word_pronunciations`   | Guarda fonética, acentos y audios de pronunciación de una palabra.                                       |
| `word_translations`     | Guarda traducciones al español u otros idiomas, con posibilidad de revisión administrativa.              |
| `user_saved_words`      | Guarda palabras que el usuario cliente añade a su vocabulario personal.                                  |
| `reading_progress`      | Guarda el avance de lectura de cada usuario por historia.                                                |
| `audit_logs`            | Registra acciones administrativas sensibles para trazabilidad.                                           |
| `system_logs`           | Registra excepciones capturadas, fallos técnicos y errores operativos consultables solo por SUPER_ADMIN. |

Este resumen sirve para validar rápidamente si las tablas propuestas corresponden al alcance del proyecto. El detalle de campos, relaciones e índices se desarrolla en las secciones siguientes.

## Motor de base de datos

Motor inicial:

```text
MySQL o MariaDB
```

Motor futuro posible:

```text
PostgreSQL
```

La estructura debe evitar dependencias innecesarias de funciones exclusivas de un motor cuando exista una alternativa portable.

## ORM recomendado

La recomendación inicial es usar Prisma.

Motivos:

- buen tipado con TypeScript
- migraciones ordenadas
- integración clara con NestJS
- soporte para MySQL, MariaDB y PostgreSQL
- modelos legibles
- reduce errores de acceso a datos

La decisión final se confirmará antes de implementar migraciones.

## Guía de tipos de datos

Los tipos indicados en este documento son tipos lógicos de planificación. La definición final se mapeará al ORM y al motor elegido durante la implementación.

Tipos usados:

```text
uuid/cuid       -> identificador único de entidad
varchar(n)      -> texto corto con longitud máxima
text            -> texto largo
longtext        -> texto muy largo, útil para contenido de historias
enum(name)      -> valor controlado por una lista definida
boolean         -> verdadero/falso
integer         -> número entero
decimal(p,s)    -> número decimal con precisión
datetime        -> fecha y hora
json            -> estructura JSON controlada
```

Cuando un campo pueda quedar vacío, se marcará como `nullable`.

## Convenciones generales

### Nombres

Tablas en plural y snake_case:

```text
users
roles
stories
word_entries
```

Campos en snake_case:

```text
created_at
updated_at
deleted_at
email_verified_at
```

### Identificadores

Se recomienda usar identificadores UUID o cuid.

Criterios:

- evitan exponer conteos incrementales
- facilitan integración entre clientes
- funcionan bien en APIs públicas

La decisión exacta se definirá durante implementación según ORM elegido y motor final.

### Fechas

Tablas principales deben incluir:

```text
created_at
updated_at
```

Tablas que permitan eliminación lógica deben incluir:

```text
deleted_at
```

### Estados

Los estados deben representarse con valores controlados.

Ejemplos:

```text
active
inactive
blocked
draft
published
archived
```

La lista final por entidad se definirá en `04-logica-negocio.md`.

## Diagrama conceptual

Relaciones principales:

```text
users
  -> user_roles
    -> roles
      -> role_permissions
        -> permissions

users
  -> refresh_tokens

users
  -> password_reset_tokens

users
  -> user_saved_words
    -> word_entries

users
  -> reading_progress
    -> stories

stories
  -> reading_levels
  -> story_assets

word_entries
  -> word_examples
  -> word_pronunciations
  -> word_translations

audit_logs
  -> users

system_logs
  -> users
```

## Tablas de seguridad y usuarios

### users

Almacena usuarios administrativos y usuarios cliente.

Campos propuestos:

```text
id: uuid/cuid
email: varchar(255)
phone_number: varchar(30) nullable
password_hash: varchar(255)
first_name: varchar(100)
last_name: varchar(100)
status: enum(user_status)
email_verified_at: datetime nullable
phone_verified_at: datetime nullable
last_login_at: datetime nullable
created_at: datetime
updated_at: datetime
deleted_at: datetime nullable
```

Notas:

- `email` debe ser único.
- `phone_number` debe ser único cuando exista, porque podría usarse para inicio de sesión más adelante.
- `password_hash` nunca debe devolverse por API.
- `status` permite bloquear o desactivar usuarios.
- La separación entre administrador y cliente se determina mediante roles.
- `first_name` y `last_name` se almacenan separados para facilitar búsqueda, visualización y formularios administrativos.
- `phone_verified_at` queda previsto para una futura validación de número telefónico.

Índices recomendados:

```text
unique(email)
unique(phone_number)
index(status)
index(deleted_at)
```

### roles

Almacena roles del sistema.

Roles iniciales:

```text
SUPER_ADMIN
ADMIN
CLIENT
```

Campos propuestos:

```text
id: uuid/cuid
code: varchar(50)
name: varchar(100)
description: varchar(255) nullable
is_system: boolean
created_at: datetime
updated_at: datetime
```

Notas:

- `code` debe ser único.
- `is_system` permite proteger roles base del sistema.

Índices recomendados:

```text
unique(code)
```

### permissions

Almacena permisos disponibles.

Campos propuestos:

```text
id: uuid/cuid
code: varchar(100)
module: varchar(50)
action: varchar(50)
description: varchar(255) nullable
created_at: datetime
updated_at: datetime
```

Ejemplos de `code`:

```text
stories.create
stories.read
stories.update
stories.delete
users.read
roles.assign
audit.read
```

Índices recomendados:

```text
unique(code)
index(module)
index(action)
```

### user_roles

Relaciona usuarios con roles.

Campos propuestos:

```text
id: uuid/cuid
user_id: uuid/cuid FK -> users.id
role_id: uuid/cuid FK -> roles.id
created_at: datetime
```

Índices recomendados:

```text
unique(user_id, role_id)
index(user_id)
index(role_id)
```

### role_permissions

Relaciona roles con permisos.

Campos propuestos:

```text
id: uuid/cuid
role_id: uuid/cuid FK -> roles.id
permission_id: uuid/cuid FK -> permissions.id
created_at: datetime
```

Índices recomendados:

```text
unique(role_id, permission_id)
index(role_id)
index(permission_id)
```

### refresh_tokens

Almacena sesiones renovables.

Campos propuestos:

```text
id: uuid/cuid
user_id: uuid/cuid FK -> users.id
token_hash: varchar(255)
expires_at: datetime
revoked_at: datetime nullable
replaced_by_token_id: uuid/cuid nullable FK -> refresh_tokens.id
device_identifier: varchar(150) nullable
platform: varchar(50) nullable
app_version: varchar(50) nullable
device_name: varchar(150) nullable
ip_address: varchar(45) nullable
user_agent: varchar(500) nullable
created_at: datetime
updated_at: datetime
```

Notas:

- El refresh token debe guardarse hasheado.
- `revoked_at` permite invalidar sesión sin eliminar historial.
- `replaced_by_token_id` permite rastrear rotación de tokens.
- `device_identifier` permite aplicar la política de un solo dispositivo por usuario cliente.
- `platform` y `app_version` ayudan a trazabilidad de sesiones móviles.

Índices recomendados:

```text
index(user_id)
index(device_identifier)
index(expires_at)
index(revoked_at)
```

### password_reset_tokens

Almacena tokens temporales para recuperación de contraseña.

Campos propuestos:

```text
id: uuid/cuid
user_id: uuid/cuid nullable FK -> users.id
email: varchar(255)
token_hash: varchar(255)
expires_at: datetime
used_at: datetime nullable
ip_address: varchar(45) nullable
user_agent: varchar(500) nullable
created_at: datetime
updated_at: datetime
```

Notas:

- El token debe guardarse hasheado.
- `email` permite registrar solicitudes aun cuando no se exponga si el usuario existe.
- `used_at` evita reutilizar tokens.
- No se debe guardar el token plano.

Índices recomendados:

```text
index(user_id)
index(email)
index(expires_at)
index(used_at)
```

## Tablas de contenido

### reading_levels

Define niveles de lectura.

Campos propuestos:

```text
id: uuid/cuid
code: varchar(20)
name: varchar(100)
description: text nullable
sort_order: integer
is_active: boolean
created_at: datetime
updated_at: datetime
deleted_at: datetime nullable
```

Ejemplos conceptuales:

```text
A1
A2
B1
B2
```

Índices recomendados:

```text
unique(code)
index(is_active)
index(sort_order)
```

### stories

Almacena cuentos, historias y lecturas.

Campos propuestos:

```text
id: uuid/cuid
reading_level_id: uuid/cuid FK -> reading_levels.id
title: varchar(200)
slug: varchar(220)
summary: text nullable
content: longtext
status: enum(story_status)
estimated_reading_minutes: integer nullable
sort_order: integer
published_at: datetime nullable
created_by_user_id: uuid/cuid nullable FK -> users.id
updated_by_user_id: uuid/cuid nullable FK -> users.id
created_at: datetime
updated_at: datetime
deleted_at: datetime nullable
```

Notas:

- `content` almacena el texto base de lectura en inglés.
- `status` permite trabajar con borradores y publicaciones.
- `slug` debe ser único si se expone en URLs.

Índices recomendados:

```text
unique(slug)
index(reading_level_id)
index(status)
index(published_at)
index(deleted_at)
```

### story_assets

Almacena recursos asociados a una historia.

Campos propuestos:

```text
id: uuid/cuid
story_id: uuid/cuid FK -> stories.id
type: enum(story_asset_type)
storage_disk: varchar(50)
storage_path: varchar(1000) nullable
original_file_name: varchar(255) nullable
mime_type: varchar(100)
file_size_bytes: integer
access_scope: enum(file_access_scope)
metadata: json nullable
sort_order: integer
created_at: datetime
updated_at: datetime
deleted_at: datetime nullable
```

Tipos conceptuales:

```text
cover_image
audio
attachment
```

Notas:

- `metadata` puede guardar duración, tamaño, mimetype u otra información no crítica.
- Los archivos de historias deben almacenarse como recursos protegidos, no como URLs públicas directas.
- `access_scope` debe permitir diferenciar recursos privados y cualquier recurso que en el futuro se autorice como público.
- La API debe entregar archivos mediante endpoints protegidos o URLs temporales firmadas si se implementa almacenamiento externo.
- La estrategia exacta de almacenamiento se definirá en `07-operacion-y-despliegue.md`.

Índices recomendados:

```text
index(story_id)
index(type)
index(access_scope)
```

## Tablas de diccionario y traducción

### word_entries

Almacena palabras normalizadas consultadas por usuarios o administradores.

Campos propuestos:

```text
id: uuid/cuid
word: varchar(150)
normalized_word: varchar(150)
language: varchar(10)
phonetic: varchar(150) nullable
definition_en: text nullable
part_of_speech: enum(part_of_speech) nullable
source: varchar(100) nullable
review_status: enum(review_status)
reviewed_by_user_id: uuid/cuid nullable FK -> users.id
reviewed_at: datetime nullable
created_at: datetime
updated_at: datetime
deleted_at: datetime nullable
```

Notas:

- `normalized_word` debe usarse para búsquedas y evitar duplicados.
- `definition_en` contiene la definición principal en inglés.
- `review_status` permite revisión manual administrativa.

Índices recomendados:

```text
unique(normalized_word, language)
index(review_status)
index(part_of_speech)
```

### word_examples

Almacena ejemplos de uso por palabra.

Campos propuestos:

```text
id: uuid/cuid
word_entry_id: uuid/cuid FK -> word_entries.id
example_text: text
source: varchar(100) nullable
sort_order: integer
created_at: datetime
updated_at: datetime
```

Índices recomendados:

```text
index(word_entry_id)
```

### word_pronunciations

Almacena pronunciaciones y audios disponibles.

Campos propuestos:

```text
id: uuid/cuid
word_entry_id: uuid/cuid FK -> word_entries.id
accent: varchar(10) nullable
phonetic: varchar(150) nullable
audio_url: varchar(1000) nullable
source: varchar(100) nullable
created_at: datetime
updated_at: datetime
```

Ejemplos de `accent`:

```text
en-US
en-GB
```

Índices recomendados:

```text
index(word_entry_id)
index(accent)
```

### word_translations

Almacena traducciones de palabras.

Campos propuestos:

```text
id: uuid/cuid
word_entry_id: uuid/cuid FK -> word_entries.id
target_language: varchar(10)
translation: varchar(255)
meaning_context: text nullable
source: varchar(100) nullable
review_status: enum(review_status)
reviewed_by_user_id: uuid/cuid nullable FK -> users.id
reviewed_at: datetime nullable
created_at: datetime
updated_at: datetime
deleted_at: datetime nullable
```

Notas:

- Para este proyecto, el idioma objetivo inicial será español.
- `meaning_context` permite diferenciar traducciones según contexto.
- Las correcciones manuales desde React Admin deben reflejarse para Flutter.

Índices recomendados:

```text
index(word_entry_id)
index(target_language)
index(review_status)
```

## Tablas de experiencia del cliente

### user_saved_words

Almacena vocabulario guardado por usuarios cliente.

Campos propuestos:

```text
id: uuid/cuid
user_id: uuid/cuid FK -> users.id
word_entry_id: uuid/cuid FK -> word_entries.id
story_id: uuid/cuid nullable FK -> stories.id
status: enum(saved_word_status)
saved_at: datetime
last_reviewed_at: datetime nullable
created_at: datetime
updated_at: datetime
deleted_at: datetime nullable
```

Estados conceptuales:

```text
saved
learning
learned
archived
```

Índices recomendados:

```text
unique(user_id, word_entry_id)
index(user_id)
index(word_entry_id)
index(status)
```

### reading_progress

Almacena progreso de lectura por usuario e historia.

Campos propuestos:

```text
id: uuid/cuid
user_id: uuid/cuid FK -> users.id
story_id: uuid/cuid FK -> stories.id
progress_percent: decimal(5,2)
last_position: varchar(255) nullable
completed_at: datetime nullable
last_read_at: datetime nullable
created_at: datetime
updated_at: datetime
```

Notas:

- `last_position` puede representar posición de texto, párrafo o marcador lógico.
- La forma exacta se definirá en lógica de negocio y contrato Flutter.

Índices recomendados:

```text
unique(user_id, story_id)
index(user_id)
index(story_id)
index(last_read_at)
```

## Tablas de auditoría

### audit_logs

Registra acciones administrativas sensibles.

Campos propuestos:

```text
id: uuid/cuid
actor_user_id: uuid/cuid nullable FK -> users.id
action: varchar(100)
entity_type: varchar(100)
entity_id: uuid/cuid nullable
summary: varchar(255)
metadata: json nullable
ip_address: varchar(45) nullable
user_agent: varchar(500) nullable
created_at: datetime
```

Notas:

- No debe almacenar contraseñas, tokens, secretos ni datos sensibles innecesarios.
- `metadata` puede guardar cambios relevantes de forma controlada.
- Debe permitir rastrear quién hizo qué y cuándo.

Índices recomendados:

```text
index(actor_user_id)
index(action)
index(entity_type, entity_id)
index(created_at)
```

### system_logs

Registra excepciones capturadas, fallos técnicos y errores operativos relevantes.

Campos propuestos:

```text
id: uuid/cuid
level: enum(system_log_level)
source: varchar(100)
message: varchar(500)
exception_name: varchar(150) nullable
error_code: varchar(100) nullable
request_method: varchar(10) nullable
request_path: varchar(500) nullable
actor_user_id: uuid/cuid nullable FK -> users.id
ip_address: varchar(45) nullable
user_agent: varchar(500) nullable
metadata: json nullable
created_at: datetime
```

Niveles conceptuales:

```text
info
warning
error
critical
```

Notas:

- Esta tabla almacena errores técnicos y operativos, no auditoría funcional.
- Solo `SUPER_ADMIN` debe poder consultar estos registros desde React Admin.
- No debe almacenar contraseñas, tokens completos, secretos ni datos sensibles innecesarios.
- `metadata` debe sanitizarse antes de guardar información adicional.

Índices recomendados:

```text
index(level)
index(source)
index(actor_user_id)
index(created_at)
index(error_code)
```

## Soft delete

Las entidades principales que puedan ocultarse o restaurarse deben usar eliminación lógica.

Candidatas:

```text
users
stories
reading_levels
story_assets
word_entries
word_translations
user_saved_words
```

No todas las tablas requieren soft delete. Tablas de relación simples y auditoría pueden conservar registros sin `deleted_at`.

La decisión final por tabla se confirmará antes de crear migraciones.

## Índices y rendimiento

Debe priorizarse indexar:

- campos usados en login
- campos usados en búsqueda
- claves foráneas
- estados frecuentes
- fechas usadas para ordenamiento
- campos usados en listados administrativos
- campos usados para filtrar logs del sistema

No se deben crear índices innecesarios antes de conocer consultas reales, pero los índices obvios de relaciones y búsqueda deben planificarse desde el inicio.

## Transacciones e integridad

Las operaciones que afecten varias tablas deben ejecutarse de forma transaccional.

Objetivo:

```text
si una inserción, actualización o eliminación falla,
se revierte toda la operación relacionada
```

Esto evita inconsistencias como:

- usuario creado sin roles
- historia creada sin recursos requeridos
- palabra creada sin traducciones o pronunciaciones esperadas
- refresh token rotado parcialmente
- permisos de rol incompletos
- acción administrativa sin auditoría cuando corresponda

El diseño de repositorios y casos de uso debe permitir ejecutar estas operaciones bajo una misma transacción.

## Compatibilidad MySQL/MariaDB/PostgreSQL

Criterios de compatibilidad:

- Evitar SQL específico del motor cuando no sea necesario.
- Evitar depender de tipos especiales sin alternativa.
- Revisar uso de JSON según soporte del motor elegido.
- Mantener migraciones controladas por ORM.
- Usar convenciones consistentes para nombres de constraints e índices.

Si se usa `metadata` tipo JSON, debe validarse compatibilidad con el motor inicial.

## Datos semilla

Datos semilla iniciales propuestos:

```text
roles:
  SUPER_ADMIN
  ADMIN
  CLIENT

reading_levels:
  A1
  A2
  B1
  B2

users:
  SUPER_ADMIN inicial
  ADMIN inicial

stories:
  historia inicial 1
  historia inicial 2
```

También se requerirá un usuario `SUPER_ADMIN` inicial y un usuario `ADMIN`
inicial para validar flujos administrativos desde el inicio.

Las historias semilla deben cargarse solo con texto y metadatos mínimos. No se
requiere cargar imágenes, audios ni otros assets en los seeders iniciales.

Los audios `.mp3`, significados, traducciones, fonética y pronunciaciones podrán
obtenerse en tiempo real mediante las integraciones aprobadas y luego
almacenarse en las tablas correspondientes para evitar consumos repetidos.

Reglas para usuarios semilla:

- no hardcodear contraseñas definitivas en el código
- usar contraseñas temporales solo en entorno local
- permitir cambiar las credenciales mediante variables de entorno o mecanismo seguro
- asignar rol `SUPER_ADMIN` al usuario root inicial
- asignar rol `ADMIN` al usuario administrativo inicial
- no crear usuarios cliente semilla salvo que una prueba lo requiera

Reglas para historias semilla:

- cargar mínimo dos historias
- usar contenido en inglés
- asociarlas a un nivel de lectura existente
- dejarlas en estado publicado o borrador según el flujo que se quiera validar
- no crear registros en `story_assets` para estas historias iniciales

En desarrollo local, los seeders pueden volver a ejecutarse cuando sea necesario
para reconstruir datos base. Esta regla no aplica a ambientes de staging o
producción.

## Reglas de impacto cruzado

Cambios en este modelo pueden impactar:

`english_reader_admin`:

- formularios
- tablas administrativas
- filtros
- permisos visibles
- validaciones del frontend
- modelos TypeScript
- módulo de logs del sistema visible solo para SUPER_ADMIN

`english_reader_app`:

- modelos Dart
- lectura de historias
- detalle de palabras
- vocabulario
- progreso
- autenticación de cliente

Cualquier cambio estructural debe revisarse junto con contratos API antes de implementarse.

## Definiciones vigentes de implementación

- El ORM final es Prisma.
- Los identificadores usan UUID v7 mediante Prisma.
- El motor inicial es MariaDB/MySQL.
- Las reglas finales de campos, enums, índices y relaciones están en
  `prisma/schema.prisma`.
- La matriz inicial de permisos se define en `PermissionCode` y se siembra desde
  `role-permissions.matrix.ts`.
- Los archivos se almacenan como `story_assets` y el binario vive en
  almacenamiento local privado.
- Las traducciones se almacenan por palabra y pueden incluir contexto mediante
  `meaning_context`.
- La revisión de palabras/traducciones se registra con estado, usuario revisor y
  fecha; no se implementa historial de versiones por cada revisión en esta
  etapa.
- `system_logs` conserva registros por 6 meses mediante scheduler configurable.

## Pendientes de definición

- Definir entidades adicionales para ejercicios o práctica si el alcance crece.
- Definir si una etapa futura requiere historial de revisiones de contenido.

## Criterios de cierre de este documento

Este documento se considera suficiente cuando define:

- motor inicial de base de datos
- ORM recomendado
- convenciones de nombres
- entidades principales
- campos propuestos
- relaciones principales
- índices iniciales
- criterios de soft delete
- datos semilla iniciales
- compatibilidad futura con PostgreSQL
- impacto sobre React Admin y Flutter
