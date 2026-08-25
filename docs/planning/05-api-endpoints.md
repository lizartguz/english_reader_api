# API endpoints - English Reader API

## Objetivo

Este documento define estándares generales para rutas, contratos HTTP, paginación, filtros, validaciones y errores de `english_reader_api`.

No define diseño visual de React Admin ni pantallas Flutter. Los clientes deben consumir estos contratos sin duplicar reglas críticas de backend.

## Ecosistema relacionado

```text
english_reader_api    -> expone contratos HTTP y aplica reglas.
english_reader_admin  -> consume endpoints administrativos para CRUD y seguridad.
english_reader_app    -> consume endpoints de app para lectura, palabras, vocabulario y progreso.
```

## Base de rutas

Todas las rutas deben estar versionadas:

```text
/api/v1
```

Separación por contexto:

```text
/api/v1/auth/*
/api/v1/admin/*
/api/v1/app/*
```

## Estándar CRUD administrativo

Los módulos administrativos deben seguir un patrón consistente.

Ejemplo conceptual para historias:

```text
GET    /api/v1/admin/stories
POST   /api/v1/admin/stories
GET    /api/v1/admin/stories/:id
PATCH  /api/v1/admin/stories/:id
DELETE /api/v1/admin/stories/:id
PATCH  /api/v1/admin/stories/:id/status
```

Este patrón debe adaptarse a cada recurso sin forzar rutas innecesarias.

## Listados, filtros y paginación

Los endpoints de listado deben soportar paginación.

Formato general:

```text
?page=1&limit=20&search=&sort=created_at&order=desc
```

Los filtros deben ser los necesarios para cada módulo.

Ejemplo para historias:

```text
status
reading_level_id
search
published_from
published_to
```

La API debe validar que `sort`, `order`, `page`, `limit` y filtros pertenezcan a valores permitidos.

## Respuestas

Respuesta exitosa:

```json
{
  "success": true,
  "message": "Operación completada",
  "data": {},
  "meta": {}
}
```

Respuesta con error controlado:

```json
{
  "success": false,
  "message": "No se pudo completar la operación.",
  "errors": []
}
```

Los mensajes deben ser amigables y seguros.

## Validaciones

Toda entrada debe validarse mediante DTOs antes de ejecutar casos de uso.

La validación debe contemplar:

- campos obligatorios
- longitudes máximas
- tipos de dato
- valores permitidos
- relaciones existentes
- reglas de estado

React Admin y Flutter pueden validar antes de enviar, pero la API siempre debe repetir las validaciones.

## Eliminación y confirmación

La API debe proteger operaciones destructivas con permisos específicos.

React Admin debe mostrar ventana de confirmación antes de invocar endpoints de eliminación.

La API no debe depender de que el frontend haya mostrado confirmación. Debe validar permisos, existencia del recurso y reglas de negocio antes de eliminar o archivar.

Cuando aplique, se preferirá eliminación lógica mediante `deleted_at`.

## Cambios de estado

Los recursos con estado deben modificarse mediante operaciones claras.

Ejemplos:

```text
draft
published
archived
active
inactive
blocked
```

La API debe validar transiciones de estado permitidas.

## Escrituras transaccionales

Los endpoints que generen escrituras en múltiples tablas deben ejecutar la operación dentro de una transacción.

Si falla una inserción, actualización, eliminación o registro relacionado, la API debe revertir todo el cambio y devolver un error controlado.

Ejemplos:

```text
POST /api/v1/admin/stories
POST /api/v1/admin/users
PATCH /api/v1/admin/roles/:id/permissions
GET /api/v1/app/words/lookup
POST /api/v1/app/vocabulary
POST /api/v1/auth/reset-password
```

La respuesta al cliente debe ser amigable y el detalle técnico debe registrarse según corresponda en logs del sistema.

## Errores técnicos

Los errores técnicos deben registrarse en logs del backend.

La respuesta al cliente debe ser amigable:

```text
No se pudo completar la operación. Inténtalo nuevamente.
```

No se deben exponer errores SQL, stack traces, nombres internos de clases, tokens, secretos ni mensajes crudos de proveedores.

Las excepciones y fallos capturados deben registrarse en `system_logs` cuando correspondan a errores operativos relevantes.

Ejemplos:

```text
fallo de base de datos
fallo de proveedor externo
error de envío de correo
excepción inesperada
fallo crítico en operación administrativa
```

La API debe evitar registrar datos sensibles dentro de `system_logs`.

## Autorización

Cada endpoint protegido debe declarar autenticación y permisos requeridos.

React Admin puede ocultar opciones del menú o acciones de tabla, pero la API debe validar permisos en cada request.

Los endpoints de consulta de logs del sistema deben estar disponibles solo para `SUPER_ADMIN`.

Permiso sugerido:

```text
system_logs.read
```

## Sesión móvil y dispositivo único

Los endpoints de autenticación usados por Flutter deben aceptar información del dispositivo.

Datos esperados:

```text
device_id
platform
app_version
device_name opcional
```

Endpoints conceptuales:

```text
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET  /api/v1/auth/verify-session
POST /api/v1/auth/logout
```

Cuando un usuario `CLIENT` inicia sesión en un nuevo dispositivo, la API debe invalidar sesiones activas anteriores del mismo usuario.

Flutter debe verificar la sesión al iniciar la app.

Si la sesión fue invalidada por otro dispositivo, la API debe responder con un código controlado:

```text
session_invalidated
```

El cliente debe mostrar un mensaje amigable y limpiar sesión local.

## Impacto en React Admin

Los contratos de endpoints deben permitir:

- tablas con paginación
- filtros superiores
- modales de creación y edición
- dropdown de acciones por fila
- confirmación antes de eliminar
- mensajes de éxito y error
- control visual según permisos
- módulo de logs del sistema visible solo para SUPER_ADMIN

## Impacto en Flutter

Los contratos de endpoints deben permitir:

- listar historias disponibles
- abrir historia
- consultar palabra
- guardar palabra
- reproducir o solicitar información de pronunciación
- sincronizar progreso
- manejar sesión de cliente
- enviar `device_id` para política de un dispositivo

## Pendientes de definición

- Completar en Swagger cualquier respuesta de error específica que falte por
  endpoint.
- Definir contratos adicionales solo si Flutter o React Admin requieren nuevos
  flujos no cubiertos por los endpoints actuales.

## Documentación OpenAPI vigente

La API publica documentación Swagger/OpenAPI en:

```text
GET /api/docs
```

Debe habilitarse con `SWAGGER_ENABLED=true`. El documento se genera desde los
controladores y DTOs de NestJS.

## Criterios de cierre de este documento

Este documento se considera suficiente cuando define:

- rutas base
- patrón CRUD administrativo
- paginación, filtros y ordenamiento
- estructura de respuestas
- validaciones
- manejo de eliminación y cambios de estado
- errores seguros
- autorización por endpoint
- impacto sobre React Admin y Flutter
