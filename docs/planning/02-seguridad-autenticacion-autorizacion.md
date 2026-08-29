# Seguridad, autenticación y autorización - English Reader API

## Objetivo

Este documento define la planificación de seguridad para `english_reader_api`.

Su alcance incluye autenticación, autorización, roles, permisos, tokens, sesiones, protección de endpoints, validaciones de acceso y auditoría de acciones sensibles.

No define tablas, campos ni relaciones exactas de base de datos. Ese detalle pertenece a `03-modelo-base-datos.md`.

## Ecosistema relacionado

English Reader está compuesto por tres proyectos:

```text
english_reader_api    -> NestJS: fuente central de autenticación, autorización, reglas y datos.
english_reader_admin  -> React: panel administrativo para usuarios SUPER_ADMIN y ADMIN.
english_reader_app    -> Flutter: aplicación para usuarios CLIENT.
```

React Admin y Flutter pueden ocultar o mostrar opciones según permisos, pero la autorización real siempre debe validarse en la API.

## Principios de seguridad

- La API es la única fuente confiable para autenticación y autorización.
- No se deben confiar permisos enviados desde React Admin o Flutter.
- Los roles y permisos deben ser flexibles y administrables, no reglas rígidas dispersas por el código.
- Las contraseñas nunca deben almacenarse en texto plano.
- Los tokens deben tener expiración y estrategia de renovación.
- Las rutas administrativas deben exigir autenticación y permisos explícitos.
- Los errores de seguridad no deben revelar información sensible.
- Las acciones sensibles deben quedar auditadas.
- La configuración sensible debe vivir en variables de entorno.
- Las validaciones deben ocurrir antes de ejecutar casos de uso.

## Modelo de acceso

El sistema usará un modelo RBAC:

```text
Role-Based Access Control
```

Esto permite asignar permisos a roles y roles a usuarios.

Roles iniciales:

```text
SUPER_ADMIN
ADMIN
CLIENT
```

La arquitectura debe permitir crecer hacia permisos más específicos sin reescribir toda la autorización.

## Roles iniciales

### SUPER_ADMIN

Rol raíz del sistema.

Responsabilidades y capacidades generales:

- administrar usuarios administradores
- activar, desactivar o eliminar administradores según reglas definidas
- gestionar configuración crítica del sistema
- acceder a auditoría administrativa sensible
- ejecutar operaciones reservadas de mantenimiento o control

Este rol debe usarse con criterio y no debe asignarse a usuarios operativos comunes.

### ADMIN

Rol administrativo operativo.

Responsabilidades y capacidades generales:

- gestionar historias, cuentos y contenido
- gestionar niveles de lectura
- revisar palabras, traducciones y pronunciaciones
- administrar usuarios cliente según permisos
- consultar reportes o información administrativa permitida

Un usuario ADMIN no debe poder eliminar, degradar o bloquear a un SUPER_ADMIN.

La regla exacta sobre eliminación o gestión de otros ADMIN se definirá en la matriz de permisos.

### CLIENT

Rol del usuario final de la aplicación Flutter.

Responsabilidades y capacidades generales:

- iniciar sesión en la app
- consultar historias disponibles
- leer historias
- consultar palabras
- guardar vocabulario
- registrar progreso de lectura
- gestionar datos básicos de su propio perfil

Este rol no debe tener acceso a rutas administrativas.

## Política de un dispositivo por usuario cliente

Para evitar uso compartido de cuentas, un usuario `CLIENT` solo debe tener una sesión activa en un dispositivo a la vez.

Regla recomendada:

```text
el inicio de sesión en un nuevo dispositivo invalida la sesión anterior del mismo usuario CLIENT
```

Flujo conceptual:

```text
CLIENT inicia sesión desde dispositivo B
  -> API valida credenciales
  -> API recibe device_id, platform y app_version
  -> API revoca refresh tokens activos anteriores del usuario CLIENT
  -> API crea sesión activa para dispositivo B
  -> dispositivo A recibe sesión invalidada en su siguiente request
```

Respuesta esperada para sesión invalidada:

```text
401 Unauthorized
session_invalidated
```

Flutter debe limpiar sesión local y mostrar mensaje amigable:

```text
Tu sesión fue cerrada porque se inició en otro dispositivo.
```

Esta regla aplica inicialmente a `CLIENT`. Para `ADMIN` y `SUPER_ADMIN`, la política puede definirse aparte según seguridad administrativa.

## Permisos

Los permisos deben representar acciones sobre módulos o recursos.

Ejemplos conceptuales:

```text
stories.create
stories.read
stories.update
stories.delete
users.read
users.update
roles.assign
audit.read
system_logs.read
```

La matriz completa de permisos se definirá en este documento cuando se planifique cada módulo con más detalle.

No se deben programar permisos como reglas sueltas en múltiples controladores. La autorización debe centralizarse mediante guards, decoradores y servicios de autorización.

## Matriz inicial sugerida de roles

Esta matriz es una propuesta inicial y puede ajustarse antes de implementar.

| Módulo / Acción                    | SUPER_ADMIN | ADMIN             | CLIENT |
| ---------------------------------- | ----------- | ----------------- | ------ |
| Acceder a React Admin              | Sí          | Sí                | No     |
| Acceder a Flutter App              | Opcional    | Opcional          | Sí     |
| Gestionar historias                | Sí          | Sí                | No     |
| Gestionar niveles de lectura       | Sí          | Sí                | No     |
| Gestionar palabras y traducciones  | Sí          | Sí                | No     |
| Gestionar usuarios cliente         | Sí          | Sí, según permiso | No     |
| Gestionar usuarios administradores | Sí          | No                | No     |
| Gestionar roles y permisos         | Sí          | No                | No     |
| Ver auditoría administrativa       | Sí          | Según permiso     | No     |
| Ver logs del sistema               | Sí          | No                | No     |
| Configuración crítica del sistema  | Sí          | No                | No     |
| Leer historias publicadas          | Sí          | Sí                | Sí     |
| Consultar palabras desde la app    | Sí          | Sí                | Sí     |
| Guardar vocabulario propio         | No aplica   | No aplica         | Sí     |
| Registrar progreso propio          | No aplica   | No aplica         | Sí     |

Reglas importantes:

- `SUPER_ADMIN` es el rol raíz.
- `ADMIN` no debe eliminar, bloquear, degradar ni modificar permisos de `SUPER_ADMIN`.
- `ADMIN` no debe gestionar otros administradores salvo que se apruebe una regla específica.
- `CLIENT` no debe acceder al panel administrativo.
- La API valida permisos aunque React Admin o Flutter oculten opciones visuales.

## Autenticación

La autenticación debe validar la identidad del usuario antes de permitir acceso a recursos protegidos.

Flujo conceptual:

```text
Usuario envía credenciales
  -> API valida credenciales
  -> API verifica estado del usuario
  -> API emite access token y refresh token
  -> Cliente usa access token para solicitudes protegidas
  -> Cliente renueva sesión con refresh token cuando corresponda
```

La API debe validar como mínimo:

- existencia del usuario
- contraseña correcta
- estado activo del usuario
- rol asignado
- restricciones de acceso según contexto

## Contraseñas

Las contraseñas deben almacenarse usando un algoritmo seguro de hashing.

Opciones recomendadas:

```text
argon2
bcrypt
```

La recomendación inicial es evaluar `argon2` por ser una opción moderna y robusta. La decisión final se tomará en etapa de implementación.

Reglas generales:

- nunca guardar contraseñas en texto plano
- nunca devolver contraseñas ni hashes en respuestas API
- aplicar longitud mínima y validación de complejidad razonable
- registrar cambios de contraseña como eventos auditables cuando corresponda

## Tokens

La API debe usar dos tipos de tokens:

```text
Access token
Refresh token
```

Para sesiones móviles de usuarios `CLIENT`, los tokens deben asociarse al dispositivo que inició sesión.

Para el panel administrativo, la duración máxima planificada de sesión será de ocho horas desde el inicio de sesión.

Durante ese periodo puede existir renovación mediante refresh token según estrategia definida. Superado el tiempo máximo, la API debe rechazar la sesión y el cliente debe redirigir al login.

### Access token

Token de corta duración usado para acceder a rutas protegidas.

Debe contener solo información necesaria, por ejemplo:

```text
user id
session id o token id
roles/permisos mínimos necesarios
expiración
```

No debe contener datos sensibles innecesarios.

### Refresh token

Token de mayor duración usado para renovar el access token.

Debe poder invalidarse al cerrar sesión, cambiar contraseña o detectar actividad sospechosa.

La estrategia recomendada es almacenar refresh tokens de forma controlada en backend, idealmente con hash, estado, expiración e información básica del dispositivo o sesión.

Los campos exactos pertenecen a `03-modelo-base-datos.md`.

## Almacenamiento de tokens por cliente

### React Admin

Para el panel administrativo web, la estrategia recomendada es:

- access token de corta duración
- refresh token protegido, preferentemente mediante cookie `HttpOnly`, `Secure` y `SameSite` cuando el despliegue lo permita
- CORS configurado de forma explícita

Si se usa cookie para refresh token, deben evaluarse medidas contra CSRF.

### Flutter App

Para la aplicación móvil, la estrategia recomendada es:

- access token de corta duración
- refresh token guardado usando almacenamiento seguro del dispositivo
- cierre de sesión que invalide la sesión en backend

Para Flutter Web, se debe revisar una estrategia compatible con las restricciones de seguridad del navegador.

## Guards y autorización en NestJS

La protección de rutas debe implementarse con mecanismos propios de NestJS:

- guards de autenticación
- guards de roles
- guards de permisos
- decoradores para declarar permisos requeridos
- servicios centralizados de autorización

Flujo conceptual:

```text
HTTP request
  -> AuthGuard valida identidad
  -> Roles/PermissionsGuard valida acceso
  -> Controller
  -> Use case
```

Los controladores no deben contener lógica compleja de permisos. Deben declarar qué permisos requieren y delegar la evaluación al sistema de autorización.

## Separación por contexto

La API tendrá rutas separadas por contexto:

```text
/api/v1/auth/*
/api/v1/admin/*
/api/v1/app/*
```

### Rutas auth

Gestionan inicio de sesión, renovación, cierre de sesión y recuperación de acceso.

### Rutas admin

Consumidas por React Admin.

Requieren usuario autenticado con rol `SUPER_ADMIN` o `ADMIN` y permisos correspondientes.

### Rutas app

Consumidas por Flutter.

Requieren usuario `CLIENT` cuando la funcionalidad pertenezca a una cuenta. Algunas rutas de contenido público podrían permitir acceso sin autenticación si así se define después.

## Estado de usuario

La autorización debe considerar el estado del usuario.

Estados conceptuales:

```text
active
inactive
blocked
pending_verification
```

El detalle exacto de estados y reglas se definirá en lógica de negocio y modelo de datos.

Un usuario no activo no debe poder renovar sesión ni acceder a recursos protegidos.

## Recuperación de acceso

La recuperación de contraseña debe diseñarse con tokens temporales y de uso limitado.

Criterios generales:

- token con expiración corta
- token de un solo uso
- no revelar si un correo existe o no
- registrar evento de solicitud y cambio de contraseña
- invalidar sesiones previas si corresponde

Flujo conceptual:

```text
Usuario solicita recuperación
  -> API valida formato de correo
  -> API responde con mensaje genérico
  -> si el usuario existe, genera token temporal
  -> API envía correo de recuperación
  -> usuario abre enlace
  -> usuario define nueva contraseña
  -> API valida token, expiración y uso previo
  -> API actualiza contraseña
  -> API invalida token y sesiones según política
```

La respuesta pública debe ser genérica para no revelar si un correo existe:

```text
Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.
```

El token de recuperación debe almacenarse hasheado en backend. Nunca debe guardarse ni registrarse el token plano en logs.

## Configuración de correo SMTP

El envío de correos debe configurarse mediante variables de entorno.

Configuración esperada:

```text
MAIL_HOST
MAIL_PORT
MAIL_USERNAME
MAIL_PASSWORD
MAIL_FROM_ADDRESS
MAIL_FROM_NAME
MAIL_SECURE
```

Reglas:

- las credenciales SMTP no deben versionarse
- el remitente debe ser configurable por ambiente
- los errores técnicos del proveedor de correo deben registrarse en logs
- el usuario debe recibir mensajes amigables, no detalles SMTP
- producción debe usar credenciales reales y seguras

El detalle operativo de ambientes y secretos se ampliará en `07-operacion-y-despliegue.md`.

## Rate limiting y protección contra abuso

La API debe aplicar límites de uso en endpoints sensibles.

Endpoints prioritarios:

- login
- refresh token
- recuperación de contraseña
- consulta masiva de palabras
- endpoints públicos de lectura si se exponen sin autenticación

El objetivo es reducir intentos de fuerza bruta, abuso de proveedores externos y consumo innecesario de recursos.

## CORS y orígenes permitidos

CORS debe configurarse explícitamente por ambiente.

Orígenes esperados:

```text
development -> React Admin local, Flutter Web local
staging     -> dominios de prueba
production  -> dominios oficiales
```

No se debe usar configuración abierta en producción.

## Auditoría de acciones sensibles

La API debe registrar acciones administrativas sensibles.

Ejemplos:

- inicio de sesión administrativo
- cierre de sesión administrativo
- creación, edición o eliminación de usuarios
- cambios de roles o permisos
- publicación o eliminación de historias
- cambios manuales en palabras o traducciones
- cambios de configuración crítica

La auditoría debe registrar información útil para trazabilidad sin almacenar secretos ni datos sensibles innecesarios.

El modelo exacto de auditoría se definirá en `03-modelo-base-datos.md`.

## Manejo seguro de errores

Los errores relacionados con autenticación y autorización deben ser claros para el cliente, pero no deben revelar información sensible.

Ejemplos:

- No revelar si falló el correo o la contraseña por separado.
- No devolver detalles internos de JWT.
- No exponer stack traces.
- No incluir secretos, tokens o hashes en logs ni respuestas.

React Admin y Flutter deben recibir mensajes controlados y códigos HTTP consistentes.

## Validaciones compartidas entre clientes y API

React Admin y Flutter pueden validar formularios para mejorar experiencia, pero la API debe repetir toda validación obligatoria.

Ejemplo:

```text
Si React Admin valida que el título de una historia es obligatorio,
english_reader_api también debe validarlo antes de guardar.
```

La validación del frontend ayuda al usuario. La validación del backend protege el sistema.

## Mensajes amigables y registro técnico

La API debe devolver mensajes seguros y comprensibles para usuarios finales.

No se deben devolver mensajes técnicos como:

```text
SQLSTATE error
database connection failed
undefined property
stack trace
JWT malformed internal error
```

Los detalles técnicos deben registrarse en logs del backend. Las acciones administrativas sensibles deben registrarse en auditoría.

La tabla `audit_logs` no debe reemplazar los logs técnicos. Auditoría registra acciones de negocio; `system_logs` registra fallos operativos, excepciones capturadas y errores técnicos relevantes.

## Registro de excepciones y fallos

Toda excepción o fallo capturado por la API debe evaluarse para registro en `system_logs`.

Casos que deben registrarse:

- errores de base de datos
- fallos de proveedores externos
- errores inesperados de aplicación
- excepciones controladas que indiquen riesgo operativo
- errores de envío de correo
- errores de validación técnica no atribuibles al usuario
- intentos repetidos o sospechosos sobre endpoints sensibles

Casos que normalmente no requieren `system_logs`:

- validaciones comunes de formularios
- credenciales incorrectas aisladas
- búsquedas sin resultados
- errores esperados de permisos ya controlados

Los registros técnicos no deben contener:

- contraseñas
- tokens completos
- secretos
- hashes sensibles
- datos privados innecesarios
- contenido completo de requests con información sensible

## Acceso a logs del sistema

El menú o módulo visual para consultar logs del sistema debe estar disponible únicamente para usuarios con rol `SUPER_ADMIN`.

Reglas:

- `ADMIN` no debe visualizar el menú de logs del sistema.
- `CLIENT` no debe tener acceso a endpoints administrativos ni logs.
- La API debe validar el permiso aunque React Admin oculte el menú.
- El permiso sugerido para esta opción es `system_logs.read`.

Los logs del sistema son información sensible porque pueden revelar comportamiento interno de la aplicación, fallos de infraestructura o detalles operativos.

## Reglas de impacto cruzado

Todo cambio de seguridad debe evaluarse en los tres proyectos.

Impacta a `english_reader_admin` cuando cambia:

- login administrativo
- refresh token web
- permisos de menús
- acceso a formularios
- respuestas de error
- expiración de sesión

Impacta a `english_reader_app` cuando cambia:

- login de cliente
- refresh token móvil
- acceso a historias
- consulta de palabras
- vocabulario
- progreso de lectura
- expiración de sesión

## Definiciones vigentes de implementación

- La matriz inicial de permisos se mantiene en `PermissionCode` y
  `role-permissions.matrix.ts`.
- El access token dura 15 minutos y el refresh token 30 días.
- La sesión administrativa tiene un límite absoluto de 8 horas.
- React Admin usa refresh token en cookie `HttpOnly` con protección CSRF por
  doble envío.
- Flutter Web usa `clientType: "app_web"` y refresh token en cookie `HttpOnly`;
  no debe persistir ese token en almacenamiento del navegador.
- El login móvil recibe tokens en el cuerpo de la respuesta y aplica política de
  un dispositivo para `CLIENT`.
- Las contraseñas usan Argon2 y validación mínima de complejidad.
- El bloqueo de login se activa tras 5 intentos fallidos durante 15 minutos.
- La recuperación y verificación de correo usan tokens hasheados de un solo uso.
- Las plantillas de correo usan HTML responsive de 600 px, estilos en línea,
  versión texto plano y componentes reutilizables.
- Los eventos de auditoría están centralizados en
  `audit-actions.constants.ts`.
- La estructura final de tablas está en `prisma/schema.prisma`.

## Pendientes de definición

- Ajustar estrategia específica de Flutter Web si el cliente web requiere un
  tratamiento diferente al móvil.

## Criterios de cierre de este documento

Este documento se considera suficiente cuando define:

- roles iniciales
- modelo general de permisos
- flujo de autenticación
- estrategia general de tokens
- protección de rutas en NestJS
- separación de acceso entre admin y app
- criterios de seguridad para contraseñas, CORS, rate limiting y errores
- criterios de auditoría
- decisiones vigentes y puntos que pertenecen a base de datos, endpoints o
  lógica de negocio
