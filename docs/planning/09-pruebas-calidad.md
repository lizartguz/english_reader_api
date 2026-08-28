# Pruebas y calidad - English Reader API

## Objetivo

Este documento define la estrategia de pruebas y calidad para `english_reader_api`.

El objetivo es validar reglas de negocio, seguridad, contratos de API, transacciones e integración con los clientes antes de pasar cambios a producción.

## Tipos de pruebas

La estrategia debe incluir:

```text
unit tests
integration tests
e2e tests
contract tests
security checks
regression tests
```

## Pruebas unitarias

Validan unidades pequeñas de lógica.

Prioridad:

- casos de uso
- servicios de dominio
- normalización de palabras
- validaciones
- cálculo de progreso
- reglas de estado
- permisos

## Pruebas de integración

Validan integración entre módulos internos.

Prioridad:

- repositorios con base de datos de prueba
- transacciones
- creación de usuario con roles
- creación de historia
- consulta de palabra con caché
- recuperación de contraseña
- registro de `audit_logs`
- registro de `system_logs`

## Pruebas E2E con Playwright

Se usará Playwright para pruebas E2E de flujos completos, especialmente desde React Admin y Flutter Web cuando corresponda.

Playwright permite automatizar navegadores modernos y ejecutar pruebas sobre Chromium, Firefox y WebKit.

Referencia: https://playwright.dev/

Flujos E2E prioritarios:

- login administrativo
- navegación por menú según rol
- creación de historia desde modal
- edición de historia desde modal
- confirmación de eliminación o archivo
- validaciones visibles en formularios
- paginación y filtros
- ocultamiento de logs del sistema para ADMIN
- acceso a logs del sistema para SUPER_ADMIN
- login cliente en Flutter Web
- apertura de historia en Flutter Web
- consulta de palabra y visualización del modal
- guardado de palabra en vocabulario

El flujo Flutter Web ya cuenta con validación Playwright desde
`english_reader_app/e2e`: levanta la API real, prepara una palabra estable del
diccionario local, ejecuta login cliente, abre una historia, consulta el modal
de palabra, guarda vocabulario y verifica la pantalla de vocabulario en Chrome
desktop y viewport móvil.

## Pruebas de contratos API

Los contratos deben validar:

- estructura estándar de respuesta
- códigos HTTP esperados
- DTOs request/response
- errores de validación
- paginación y `meta`
- permisos requeridos

La documentación OpenAPI/Swagger debe mantenerse alineada con estas pruebas.

## Pruebas de seguridad

Casos mínimos:

- usuario no autenticado no accede a rutas protegidas
- ADMIN no accede a logs del sistema
- CLIENT no accede a rutas administrativas
- tokens expirados son rechazados
- refresh token revocado no renueva sesión
- contraseña no se devuelve nunca por API
- errores técnicos no se exponen al usuario
- archivos privados no son accesibles sin autenticación

## Pruebas de transacciones

Toda operación multi-tabla debe tener pruebas que validen rollback.

Casos sugeridos:

- falla asignación de rol y no se crea usuario parcial
- falla creación de recurso y no queda historia inconsistente
- falla traducción y no queda palabra parcialmente guardada si la regla exige atomicidad
- falla auditoría obligatoria y se revierte operación sensible cuando corresponda

## Datos de prueba

Deben existir datos de prueba controlados:

```text
SUPER_ADMIN
ADMIN
CLIENT
historias
niveles
palabras
permisos
```

Los datos de prueba no deben contener credenciales reales.

## Ejecución en Docker

Cuando se use Docker Engine, las pruebas deben poder ejecutarse en entorno reproducible.

Recomendaciones:

- levantar API con variables de prueba
- usar base de datos de prueba separada
- limpiar datos entre suites
- ejecutar Playwright contra URLs de prueba
- no usar datos reales de producción

## Criterios de calidad antes de cerrar cambios

Antes de considerar listo un cambio importante:

- pruebas unitarias relevantes pasan
- pruebas de integración relevantes pasan
- flujos E2E críticos pasan
- no se exponen errores técnicos al cliente
- permisos se validan en API
- transacciones críticas tienen cobertura
- documentación relacionada se actualiza

## Definiciones vigentes de implementación

Comandos principales:

```text
npm run build
npm test
npm run test:e2e
```

Validación cruzada desde Flutter Web:

```text
cd ../english_reader_app
npm run e2e:web
```

La base de datos de pruebas es `english_reader_db_test` y se prepara mediante:

```text
npm run test:e2e:prepare
```

Los fixtures E2E viven en `test/helpers` y cada suite limpia datos propios antes
de validar flujos protegidos.

## Pendientes de definición

- Definir suite Playwright compartida o separada por proyecto cuando existan
  pantallas Flutter Web o React Admin listas para automatizar.
- Definir ambiente de CI si se incorpora más adelante.

## Criterios de cierre de este documento

Este documento se considera suficiente cuando define:

- tipos de pruebas
- alcance de unitarias
- alcance de integración
- E2E con Playwright
- seguridad
- transacciones
- datos de prueba
- ejecución en Docker
