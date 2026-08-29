# Arquitectura API - English Reader

## Objetivo

`english_reader_api` es el backend central del ecosistema English Reader.

Su responsabilidad principal es exponer una API segura, consistente y escalable para:

- `english_reader_admin`: panel administrativo desarrollado en React.
- `english_reader_app`: aplicación Flutter para Android, iOS y Web.

Este proyecto no debe contener la interfaz administrativa React ni la aplicación Flutter. Su función es concentrar reglas de negocio, seguridad, persistencia, integraciones externas y contratos de API.

## Ecosistema relacionado

El sistema completo se organiza en tres proyectos:

```text
english_reader_api    -> NestJS: API, backend, seguridad, reglas de negocio, base de datos e integraciones.
english_reader_admin  -> React: panel administrativo para gestión visual de contenido y configuración.
english_reader_app    -> Flutter: aplicación Android, iOS y Web para usuarios cliente.
```

La API es el punto central de verdad para datos, reglas y permisos. React Admin y Flutter no deben duplicar reglas críticas; deben consumir contratos definidos por `english_reader_api`.

Cuando se modifique arquitectura, endpoints, autenticación, permisos, modelos de datos, validaciones o formatos de respuesta, se debe evaluar el impacto en los otros dos proyectos.

## Enfoque arquitectónico

La arquitectura propuesta es:

```text
Modular Monolith + Clean Architecture + Feature Modules
```

No se iniciará con microservicios. Para esta etapa, un monolito modular permite mantener despliegue simple, código ordenado y separación clara por dominios. Si en el futuro algún módulo crece demasiado, podrá separarse con menor fricción.

## Principios

- Separar responsabilidades por módulos funcionales.
- Mantener la lógica de negocio fuera de controladores.
- Evitar reglas críticas duplicadas en React o Flutter.
- Validar permisos siempre desde la API.
- Diseñar roles y permisos de forma flexible, sin valores rígidos dispersos por el código.
- Centralizar validaciones, errores, respuestas y seguridad transversal.
- Mantener compatibilidad inicial con MySQL/MariaDB y apertura futura a PostgreSQL.
- Documentar decisiones antes de implementarlas.
- Documentar funciones, métodos y clases relevantes con comentarios breves en español.
- Evitar strings estáticos hardcodeados; usar constantes, enums o catálogos centralizados según corresponda.

## Estructura base propuesta

```text
src/
  main.ts
  app.module.ts

  config/
  common/
  database/

  modules/
    auth/
    users/
    roles/
    permissions/
    stories/
    reading-levels/
    vocabulary/
    dictionary/
    translations/
    files/
    audit/
    system-logs/
```

## Capas por módulo

Los módulos principales deben organizarse por capas:

```text
modules/{feature}/
  domain/
    entities/
    repositories/
    value-objects/

  application/
    use-cases/
    dto/

  infrastructure/
    persistence/
    external-services/
    mappers/

  presentation/
    http/
      controllers/
      requests/
      responses/
```

Esta estructura puede simplificarse en módulos pequeños, pero los módulos centrales como `auth`, `users`, `stories`, `dictionary` y `vocabulary` deben mantener separación clara.

## Comentarios de código

Las futuras implementaciones NestJS deben usar comentarios de documentación breves, claros y en español para funciones, métodos, clases, casos de uso, servicios, repositorios, guards, DTOs y lógica relevante.

El estilo recomendado es TSDoc/JSDoc de TypeScript:

```ts
/**
 * Crea una historia en estado borrador para revisión administrativa.
 */
async execute(command: CreateStoryCommand): Promise<StoryResult> {}
```

Los comentarios deben explicar el propósito o regla de negocio de la función cuando aporten claridad. En lógica compleja pueden incluir una explicación un poco más amplia; en código obvio deben evitarse comentarios innecesarios.

El detalle completo se documenta en `08-estandares-codigo.md`.

## Flujo de ejecución

El flujo general de una solicitud debe ser:

```text
HTTP request
  -> Controller
  -> Use case / Application service
  -> Domain entity / Business rules
  -> Repository interface
  -> Repository implementation
  -> Database / External service
  -> Response DTO
```

Ejemplo conceptual:

```text
POST /api/v1/admin/stories
  -> StoriesAdminController
  -> CreateStoryUseCase
  -> Story entity valida reglas principales
  -> StoryRepository guarda la historia
  -> Response DTO devuelve el resultado
```

## Módulos iniciales

### Auth

Gestiona autenticación, emisión de tokens, refresh tokens, cierre de sesión y recuperación de acceso.

El detalle completo se documentará en `02-seguridad-autenticacion-autorizacion.md`.

### Users

Gestiona usuarios administrativos y usuarios cliente.

Debe permitir distinguir entre usuarios que acceden al panel React y usuarios finales que consumen la app Flutter.

### Roles

Gestiona los roles del sistema.

Roles iniciales:

```text
SUPER_ADMIN
ADMIN
CLIENT
```

Estos roles no deben quedar codificados de forma rígida en toda la aplicación. La arquitectura debe permitir evolucionar a permisos más granulares.

### Permissions

Gestiona permisos por acción, módulo o recurso.

La matriz detallada de permisos no pertenece a este documento. Se definirá en el documento de seguridad y autorización.

### Stories

Gestiona cuentos, historias, contenido de lectura, estado de publicación, nivel, metadatos y disponibilidad para la app Flutter.

### Reading Levels

Gestiona niveles de lectura como A1, A2, B1, B2 u otra clasificación que se defina más adelante.

### Vocabulary

Gestiona palabras guardadas por el usuario, progreso de aprendizaje, estado de práctica y relación con historias leídas.

### Dictionary

Gestiona consulta y caché de palabras en inglés, incluyendo definición, fonética, ejemplos y audio de pronunciación cuando exista.

La app Flutter no debe consultar servicios externos directamente para significados. Debe consultar esta API.

### Translations

Gestiona traducciones al español, revisión manual y correcciones administrativas.

### Files

Gestiona archivos asociados, como imágenes de historias, audios, recursos multimedia o futuras cargas administrativas.

### Audit

Registra acciones administrativas sensibles, especialmente cambios de usuarios, roles, permisos, historias publicadas y eliminaciones.

## Roles a nivel arquitectónico

La API debe contemplar tres roles iniciales:

```text
SUPER_ADMIN
ADMIN
CLIENT
```

### SUPER_ADMIN

Rol raíz del sistema. Representa al perfil con máximo control administrativo y técnico.

Puede gestionar usuarios administradores, configuración crítica y operaciones sensibles.

### ADMIN

Rol administrativo para operar el panel React.

Puede gestionar contenido, historias, niveles, palabras, traducciones y usuarios cliente según los permisos asignados.

### CLIENT

Usuario final de la aplicación Flutter.

Consume historias, consulta palabras, guarda vocabulario y registra progreso de lectura.

## Límite de responsabilidad sobre roles

Este documento solo define los roles a nivel arquitectónico.

No corresponde detallar aquí:

- matriz completa de permisos
- tablas de roles y permisos
- reglas específicas de eliminación
- expiración de sesiones
- estructura de tokens
- políticas exactas de acceso por endpoint

Esos temas se documentarán en:

```text
02-seguridad-autenticacion-autorizacion.md
03-modelo-base-datos.md
05-api-endpoints.md
```

## Convención inicial de endpoints

La API debe exponer rutas versionadas:

```text
/api/v1
```

Separación inicial por contexto:

```text
/api/v1/auth/*
/api/v1/admin/*
/api/v1/app/*
```

Ejemplos conceptuales:

```text
POST /api/v1/auth/login
POST /api/v1/auth/refresh

GET  /api/v1/admin/stories
POST /api/v1/admin/stories
PATCH /api/v1/admin/stories/:id

GET  /api/v1/app/stories
GET  /api/v1/app/stories/:id
GET  /api/v1/app/words/lookup?word=beautiful
```

El contrato detallado de endpoints se definirá en `05-api-endpoints.md`.

## Persistencia

La base de datos inicial será MySQL o MariaDB.

La arquitectura debe evitar acoplarse innecesariamente a características exclusivas de un motor, porque existe la posibilidad de migrar a PostgreSQL en el futuro.

El ORM recomendado para evaluar es Prisma, por su tipado con TypeScript, migraciones y soporte para MySQL, MariaDB y PostgreSQL.

La decisión final y el modelo de tablas se documentarán en `03-modelo-base-datos.md`.

## Transacciones

Las operaciones que escriban en más de una tabla o ejecuten varios pasos persistentes dependientes deben ejecutarse dentro de una transacción.

Si una parte de la operación falla, toda la operación debe revertirse para evitar datos incompletos o inconsistentes.

Casos obligatorios:

- creación de usuario con roles iniciales
- creación o actualización de historia con recursos asociados
- consulta de palabra nueva con definición, traducciones, ejemplos y pronunciaciones
- guardado de vocabulario cuando dependa de crear previamente la palabra
- actualización de permisos por rol
- rotación de refresh tokens
- recuperación de contraseña cuando se actualice token y contraseña
- acciones administrativas que escriban entidad y auditoría relacionada

El manejo transaccional debe implementarse en la capa de aplicación o infraestructura, no dentro de los controladores.

## Integraciones externas

La API será responsable de integrar y cachear datos de servicios externos relacionados con:

- definiciones en inglés
- fonética
- ejemplos
- audio de pronunciación
- traducciones al español

Flutter no debe depender directamente de esos servicios. Flutter debe consultar la API, y la API debe decidir si responde desde caché/base de datos o si consulta un proveedor externo.

El detalle se documentará en `06-integraciones-externas.md`.

## Relación con React Admin

`english_reader_admin` será el panel administrativo visual.

Debe consumir la API para:

- iniciar sesión
- gestionar historias
- gestionar niveles
- revisar palabras y traducciones
- administrar usuarios
- consultar auditoría según permisos

React puede ocultar opciones visuales según permisos, pero la autorización real siempre debe validarse en NestJS.

## Relación con Flutter

`english_reader_app` será la aplicación de lectura para usuarios cliente.

Debe consumir la API para:

- autenticarse
- listar historias
- abrir lecturas
- consultar palabras
- guardar vocabulario
- sincronizar progreso

La experiencia de lectura y reproducción ocurre en Flutter, pero los datos y permisos deben venir desde la API.

## Estándar general de respuestas

La API debe responder con una estructura consistente para facilitar el consumo desde React Admin y Flutter.

Respuesta exitosa conceptual:

```json
{
  "success": true,
  "message": "Operación completada",
  "data": {},
  "meta": {}
}
```

Respuesta de error conceptual:

```json
{
  "success": false,
  "message": "Validación fallida",
  "errors": []
}
```

`data` debe contener el recurso o colección solicitada.

`meta` debe reservarse para información complementaria como paginación, filtros aplicados, totales o datos de contexto.

`errors` debe usarse para errores de validación, reglas de negocio o fallos controlados que el cliente pueda mostrar de forma comprensible.

## Manejo general de errores

La API debe manejar errores de forma centralizada y consistente.

Categorías iniciales:

```text
400 -> request incorrecto o parámetros inválidos
401 -> usuario no autenticado
403 -> usuario autenticado sin permisos suficientes
404 -> recurso no encontrado
409 -> conflicto de negocio o estado incompatible
422 -> datos sintácticamente válidos pero inválidos para una regla específica
500 -> error interno no controlado
502 -> error de integración con proveedor externo
503 -> servicio externo o dependencia temporalmente no disponible
```

Los errores internos no deben exponer detalles sensibles, stack traces, credenciales, consultas SQL ni información interna del servidor.

React Admin y Flutter deben recibir mensajes seguros y códigos consistentes; el detalle técnico debe quedar en logs del backend.

## Validación de entrada

Toda entrada externa debe validarse antes de llegar a los casos de uso.

Flujo esperado:

```text
HTTP request
  -> DTO validation
  -> Controller
  -> Use case / Application service
```

La validación debe contemplar:

- tipos de datos
- campos requeridos
- tamaños máximos
- formatos válidos
- enumeraciones permitidas
- sanitización o normalización cuando corresponda

Las reglas de validación de forma pertenecen a DTOs. Las reglas de negocio pertenecen a casos de uso o entidades de dominio.

## Versionado de API

La API debe publicarse bajo una ruta versionada:

```text
/api/v1
```

Los cambios compatibles pueden mantenerse dentro de la misma versión.

Los cambios incompatibles que rompan contratos usados por React Admin o Flutter deben planificarse con una estrategia de transición, por ejemplo:

- nueva versión de endpoint
- compatibilidad temporal
- documentación de migración
- actualización coordinada de clientes

La API no debe romper contratos existentes sin revisar impacto en los otros proyectos del ecosistema.

## Paginación, filtros y ordenamiento

Los endpoints que devuelvan colecciones deben usar un estándar común de paginación, búsqueda, filtros y ordenamiento.

Formato conceptual:

```text
?page=1&limit=20&search=&sort=createdAt&order=desc
```

Criterios generales:

- `page` comienza en 1.
- `limit` debe tener un máximo permitido por la API.
- `search` se usa para búsquedas generales.
- `sort` define el campo de ordenamiento permitido.
- `order` acepta valores controlados como `asc` o `desc`.

Los campos disponibles para filtrar u ordenar deben definirse por endpoint en `05-api-endpoints.md`.

La respuesta debe incluir metadatos de paginación en `meta`.

## Contratos API y documentación técnica

La API debe contar con documentación técnica de contratos para facilitar la integración con React Admin y Flutter.

La herramienta recomendada para documentar los contratos HTTP es OpenAPI/Swagger, integrada con NestJS.

La documentación de endpoints debe cubrir:

- método HTTP
- ruta
- autenticación requerida
- permisos requeridos
- parámetros
- request body
- response body
- códigos de error esperados
- ejemplos representativos

El detalle de cada endpoint se definirá en `05-api-endpoints.md`.

## Configuración por ambientes

La API debe soportar configuración separada por ambiente:

```text
development
staging
production
```

La configuración sensible debe gestionarse mediante variables de entorno y no debe versionarse en el repositorio.

Ejemplos de configuración sensible:

- credenciales de base de datos
- secretos JWT
- claves de proveedores externos
- configuración de correo
- credenciales de almacenamiento de archivos

Cada ambiente debe poder definir sus propios orígenes permitidos para CORS, URLs públicas, límites de seguridad y parámetros operativos.

## Observabilidad

La API debe contemplar observabilidad desde la arquitectura inicial.

Elementos mínimos:

- logs de aplicación
- logs de errores
- trazabilidad básica de solicitudes
- auditoría de acciones administrativas sensibles
- registro controlado de fallos de proveedores externos

Los logs no deben almacenar contraseñas, tokens completos, secretos, datos sensibles innecesarios ni contenido privado sin justificación.

Los fallos capturados por la API deben registrarse en una estructura consultable de logs del sistema cuando correspondan a errores operativos, excepciones controladas, fallos de base de datos, fallos de proveedores externos o errores inesperados.

El acceso visual a estos registros desde React Admin debe estar reservado al rol `SUPER_ADMIN`.

La auditoría funcional se documentará con más detalle en `02-seguridad-autenticacion-autorizacion.md` y `03-modelo-base-datos.md`.

## Estrategia de dependencias externas

Los proveedores externos deben integrarse mediante interfaces o adaptadores.

La lógica de negocio no debe depender directamente de una API concreta de diccionario, traducción, audio, correo o almacenamiento.

Ejemplo conceptual:

```text
DictionaryProvider
TranslationProvider
TextToSpeechProvider
StorageProvider
MailProvider
```

Esta separación permite cambiar proveedores, agregar fallback, simular servicios en pruebas y controlar mejor errores externos.

El detalle de proveedores se documentará en `06-integraciones-externas.md`.

## Criterios de cierre de este documento

Este documento se considera suficiente para cerrar la arquitectura inicial de la API cuando define:

- responsabilidades de `english_reader_api`
- relación con `english_reader_admin` y `english_reader_app`
- enfoque arquitectónico
- estructura base de carpetas
- capas internas por módulo
- flujo general de ejecución
- módulos iniciales
- roles a nivel arquitectónico
- convención de endpoints
- criterios transversales de respuestas, errores, validación y versionado
- criterios generales de paginación, documentación, ambientes, observabilidad e integraciones externas

Los detalles de seguridad, base de datos, reglas de negocio, contratos completos de endpoints e integraciones específicas pertenecen a documentos separados.

## Definiciones vigentes de implementación

- El ORM final es Prisma.
- El motor inicial de trabajo es MariaDB/MySQL.
- La autenticación usa JWT con access token y refresh token rotativo.
- React Admin y Flutter Web reciben el refresh token en cookie `HttpOnly`;
  clientes móviles lo reciben en el cuerpo de la respuesta para guardarlo en
  almacenamiento seguro.
- Los permisos se centralizan en el catálogo `PermissionCode` y se aplican con
  guards/decoradores.
- El modelo de tablas vigente está definido en `prisma/schema.prisma`.
- Las entidades principales usan soft delete cuando corresponde al flujo de
  negocio.
- Las acciones administrativas sensibles registran auditoría.
- Los proveedores iniciales son `dictionaryapi.dev`, LibreTranslate opcional,
  SMTP para correo y almacenamiento local privado para archivos.
- Los contratos HTTP se exponen bajo `/api/v1` y Swagger está disponible en
  `/api/docs` cuando `SWAGGER_ENABLED=true`.
