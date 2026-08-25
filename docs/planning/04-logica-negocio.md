# Lógica de negocio - English Reader API

## Objetivo

Este documento define las reglas y flujos principales de negocio para `english_reader_api`.

Su alcance incluye historias, niveles, consulta de palabras, traducciones, vocabulario personal, progreso de lectura y revisión administrativa.

No define contratos HTTP exactos, tablas finales ni diseño visual. Esos temas pertenecen a:

```text
03-modelo-base-datos.md
05-api-endpoints.md
```

## Ecosistema relacionado

English Reader está compuesto por tres proyectos:

```text
english_reader_api    -> NestJS: aplica reglas de negocio y expone datos seguros.
english_reader_admin  -> React: permite administrar contenido, usuarios, palabras y configuración.
english_reader_app    -> Flutter: permite leer historias, consultar palabras, escuchar pronunciación y guardar vocabulario.
```

La API debe concentrar las reglas reales. React Admin y Flutter pueden validar para mejorar experiencia, pero no deben reemplazar las reglas del backend.

## Principios de negocio

- La API es la fuente central de reglas y estados.
- Las historias publicadas deben estar disponibles para Flutter según permisos y estado.
- Las historias en borrador no deben mostrarse en la app de cliente.
- La consulta de palabras debe usar caché/base de datos antes de consumir proveedores externos.
- Las traducciones o definiciones corregidas por administración deben tener prioridad sobre datos externos.
- El progreso de lectura pertenece al usuario cliente.
- El vocabulario guardado pertenece al usuario cliente.
- Los cambios administrativos sensibles deben poder auditarse.
- Los estados deben ser controlados y predecibles.

## Roles dentro de la lógica de negocio

Roles iniciales:

```text
SUPER_ADMIN
ADMIN
CLIENT
```

### SUPER_ADMIN

Puede ejecutar operaciones administrativas críticas, gestionar usuarios administrativos y supervisar configuraciones sensibles.

### ADMIN

Gestiona contenido y operación diaria del sistema según permisos asignados.

### CLIENT

Consume historias desde Flutter, consulta palabras, guarda vocabulario y registra progreso.

La matriz exacta de permisos se mantiene en `02-seguridad-autenticacion-autorizacion.md`.

## Historias

Las historias representan contenidos de lectura en inglés.

Reglas generales:

- Una historia debe tener título y contenido.
- Una historia debe pertenecer a un nivel de lectura activo.
- Una historia puede estar en borrador, publicada o archivada.
- Solo historias publicadas deben estar disponibles para usuarios cliente.
- Una historia archivada no debe aparecer en listados públicos.
- El contenido debe mantenerse en inglés.
- La API debe permitir que React Admin gestione historias sin afectar directamente la experiencia del usuario hasta que sean publicadas.

Estados conceptuales:

```text
draft
published
archived
```

Flujo administrativo conceptual:

```text
ADMIN/SUPER_ADMIN crea historia
  -> historia queda en draft
  -> se revisa contenido, nivel y recursos
  -> se publica
  -> Flutter puede consumirla
```

## Niveles de lectura

Los niveles permiten clasificar historias por dificultad.

Niveles iniciales propuestos:

```text
A1
A2
B1
B2
```

Reglas generales:

- Un nivel puede estar activo o inactivo.
- Las historias nuevas deben asociarse a un nivel válido.
- Un nivel inactivo no debe usarse para nuevas publicaciones.
- Flutter debe poder filtrar o mostrar historias por nivel.

La clasificación exacta puede evolucionar según contenido pedagógico.

## Recursos de historias

Los recursos de historias se manejan como elementos generales asociados a una historia.

Tipos conceptuales:

```text
cover_image
audio
attachment
```

Reglas generales:

- Una historia puede tener imagen de portada.
- Una historia puede tener audio general.
- Una historia puede tener adjuntos si el alcance lo requiere.
- No se gestionarán recursos por fragmento o párrafo en esta etapa.

Si más adelante se requiere contenido enriquecido por párrafos, se deberá planificar una estructura específica antes de implementarla.

## Consulta de palabras

La consulta de palabras es una de las funciones centrales de la app Flutter.

Flujo conceptual:

```text
CLIENT toca una palabra en Flutter
  -> Flutter consulta a english_reader_api
  -> API normaliza la palabra
  -> API busca la palabra en base de datos
  -> si existe, devuelve datos guardados
  -> si no existe, consulta proveedor externo
  -> guarda resultado normalizado
  -> devuelve información a Flutter
```

Reglas generales:

- La normalización debe evitar duplicados por mayúsculas, signos o variaciones simples.
- La API debe intentar responder desde base de datos antes de usar servicios externos.
- La información revisada manualmente por administración debe tener prioridad.
- Si un proveedor externo falla, la API debe responder con un error controlado o con datos parciales si existen.
- Flutter no debe consultar directamente proveedores externos de diccionario o traducción.

Información esperada para una palabra:

```text
palabra original
palabra normalizada
idioma
definición en inglés
traducción al español
fonética
tipo gramatical
ejemplos
audio de pronunciación cuando exista
estado de revisión
```

## Normalización de palabras

La normalización debe preparar una palabra para búsqueda y caché.

Criterios iniciales:

- convertir a minúsculas
- remover espacios externos
- remover puntuación externa simple
- mantener apóstrofes internos cuando correspondan
- identificar idioma esperado inicialmente como inglés

Ejemplos:

```text
"Beautiful" -> "beautiful"
"beautiful." -> "beautiful"
"  beautiful  " -> "beautiful"
```

Casos complejos como contracciones, verbos conjugados o plurales se definirán en una etapa posterior.

## Traducciones

Las traducciones permiten mostrar significado en español.

Reglas generales:

- El idioma objetivo inicial es español.
- Una palabra puede tener más de una traducción.
- Una traducción puede depender del contexto.
- Una traducción revisada por administración debe tener prioridad sobre una traducción automática.
- Las traducciones deben poder marcarse como pendientes, revisadas o rechazadas.

Estados conceptuales de revisión:

```text
pending
reviewed
rejected
```

React Admin debe permitir revisar y corregir traducciones cuando se implemente su módulo correspondiente.

## Pronunciaciones

Las pronunciaciones ayudan al usuario a escuchar palabras.

Reglas generales:

- Una palabra puede tener pronunciaciones por acento.
- Acentos iniciales sugeridos: `en-US` y `en-GB`.
- Si existe audio de proveedor externo, puede guardarse como referencia.
- Si no existe audio externo, Flutter podrá usar texto a voz como respaldo.
- La API debe entregar datos suficientes para que Flutter decida si reproduce audio remoto o usa TTS local.

El detalle de proveedores externos se documenta en `06-integraciones-externas.md`.

## Vocabulario del usuario

El vocabulario personal permite guardar palabras consultadas.

Reglas generales:

- Un usuario cliente puede guardar una palabra.
- Una palabra no debe duplicarse en el vocabulario del mismo usuario.
- El vocabulario puede registrar desde qué historia se guardó la palabra.
- El usuario puede cambiar el estado de aprendizaje de una palabra.

Estados conceptuales:

```text
saved
learning
learned
archived
```

Flujo conceptual:

```text
CLIENT consulta palabra
  -> decide guardarla
  -> API verifica si ya existe en su vocabulario
  -> si no existe, la guarda
  -> si existe, devuelve el registro existente
```

## Progreso de lectura

El progreso permite que el usuario continúe una historia donde la dejó.

Reglas generales:

- El progreso pertenece a un usuario y una historia.
- Debe existir un único registro activo por usuario e historia.
- El progreso puede expresarse como porcentaje y posición lógica.
- Una historia puede marcarse como completada.
- La API debe aceptar actualizaciones parciales de progreso desde Flutter.

Campos conceptuales de progreso:

```text
progress_percent
last_position
completed_at
last_read_at
```

La forma exacta de `last_position` debe coordinarse con Flutter cuando se diseñe la pantalla de lectura.

## Revisión administrativa

React Admin debe permitir revisar contenido que venga de fuentes externas o que requiera control humano.

Elementos revisables:

- palabras
- definiciones
- traducciones
- ejemplos
- pronunciaciones
- historias antes de publicación

Estados conceptuales:

```text
pending
reviewed
rejected
```

Reglas generales:

- Los datos revisados manualmente tienen prioridad.
- Los cambios relevantes deben auditarse.
- Un dato rechazado no debe mostrarse como confiable en Flutter.

## Validaciones de formularios y datos

Toda regla obligatoria de formularios administrativos debe validarse en dos lugares:

```text
React Admin -> validación visual y experiencia de usuario
English Reader API -> validación real de seguridad y persistencia
```

Ejemplo:

```text
El título de una historia es obligatorio.
React Admin debe mostrar el error antes de enviar.
La API debe rechazar el request si el título falta o es inválido.
```

Las validaciones deben mostrar mensajes en español, claros y orientados al usuario.

No se deben mostrar mensajes técnicos al operador administrativo ni al usuario cliente.

## Mensajes de éxito y error

Las operaciones administrativas deben devolver resultados que permitan a React Admin mostrar mensajes amigables.

Ejemplos:

```text
Historia guardada correctamente.
No se pudo guardar la historia. Inténtalo nuevamente.
No tienes permisos para realizar esta acción.
```

Los errores técnicos deben registrarse en logs del backend. Las acciones de negocio relevantes deben registrarse en auditoría.

Las excepciones y fallos técnicos capturados por la API deben registrarse en `system_logs` cuando representen errores operativos relevantes, fallos de base de datos, fallos de proveedores externos o errores inesperados.

El usuario debe recibir un mensaje amigable. El detalle técnico debe quedar disponible solo para revisión interna autorizada.

## Auditoría funcional

La auditoría debe registrar acciones sensibles relacionadas con negocio.

Acciones sugeridas:

- publicación de historia
- archivo o eliminación lógica de historia
- corrección manual de traducción
- corrección manual de definición
- cambio de roles o permisos
- bloqueo o desactivación de usuario

La estructura exacta pertenece a `03-modelo-base-datos.md`.

## Logs del sistema

Los logs del sistema registran fallos técnicos y excepciones capturadas.

Ejemplos:

- error de conexión con base de datos
- fallo de proveedor de diccionario
- fallo de proveedor de traducción
- error de envío de correo
- excepción inesperada durante una operación administrativa
- error crítico durante procesamiento de lectura o vocabulario

Reglas generales:

- deben registrarse en `system_logs`
- deben sanitizarse antes de guardarse
- no deben exponer secretos ni tokens
- deben ser consultables solo por `SUPER_ADMIN`
- no deben mostrarse como mensaje técnico al usuario

El panel React debe tener un menú o sección para revisar logs del sistema, protegido exclusivamente para `SUPER_ADMIN`.

## Reglas de consistencia

La API debe mantener consistencia entre entidades.

Criterios:

- No publicar historias sin nivel activo.
- No mostrar historias no publicadas en Flutter.
- No duplicar palabras normalizadas por idioma.
- No duplicar vocabulario por usuario y palabra.
- No permitir progreso de lectura para historias inexistentes o no disponibles.
- No permitir que Flutter modifique datos administrativos.

## Operaciones transaccionales

Toda operación de negocio que modifique varias tablas debe ejecutarse dentro de una transacción.

Regla principal:

```text
si falla una parte de la operación,
se revierte todo el cambio
```

Ejemplos:

- crear usuario y asignar roles
- guardar historia y recursos generales
- crear palabra con ejemplos, pronunciaciones y traducciones
- guardar una palabra nueva y asociarla al vocabulario del usuario
- actualizar permisos de un rol
- cambiar contraseña e invalidar sesiones relacionadas
- registrar una acción sensible junto con su auditoría

Los controladores no deben manejar transacciones directamente. La coordinación debe ocurrir en casos de uso o servicios de aplicación.

## Reglas de impacto cruzado

Cambios en lógica de negocio pueden impactar:

`english_reader_admin`:

- formularios de historias
- revisión de traducciones
- gestión de estados
- filtros administrativos
- mensajes de validación
- modales de creación, edición, confirmación y resultado

`english_reader_app`:

- lectura de historias
- modal de palabra
- reproducción de audio
- vocabulario personal
- progreso de lectura
- mensajes de error

Todo cambio de regla debe revisarse junto con contratos API y modelos de cliente.

## Definiciones vigentes de implementación

- Las historias usan niveles de lectura y géneros.
- El campo `author` es opcional.
- Flutter solo consume historias `published`, no eliminadas.
- La publicación y archivo de historias se controla desde administración con
  auditoría.
- La normalización inicial de palabras cubre minúsculas, espacios y puntuación
  externa simple.
- Las traducciones pertenecen a una palabra y pueden guardar contexto en
  `meaningContext`.
- El vocabulario y el progreso pertenecen al usuario autenticado.

## Pendientes de definición

- Definir reglas pedagógicas exactas por nivel.
- Definir normalización avanzada de palabras.
- Definir manejo de plurales, conjugaciones y contracciones.
- Definir si habrá ejercicios o repasos de vocabulario en esta etapa.
- Definir reglas de sincronización offline para Flutter si se requiere.

## Criterios de cierre de este documento

Este documento se considera suficiente cuando define:

- reglas generales de historias
- reglas de niveles de lectura
- reglas de recursos generales de historias
- flujo de consulta y caché de palabras
- reglas de normalización
- reglas de traducciones y pronunciaciones
- reglas de vocabulario personal
- reglas de progreso de lectura
- revisión administrativa
- auditoría funcional
- impacto sobre React Admin y Flutter
