# Índice de planificación - English Reader API

Este directorio contiene la planificación técnica del proyecto `english_reader_api`.

El objetivo de estos documentos es definir primero la arquitectura, responsabilidades, seguridad, modelo de datos y flujos principales antes de comenzar la implementación.

## Ecosistema del proyecto

English Reader está compuesto por tres proyectos relacionados:

```text
english_reader_api    -> Backend NestJS, API, seguridad, reglas de negocio, persistencia e integraciones.
english_reader_admin  -> Panel administrativo React para gestión visual de contenido, usuarios, roles y configuración.
english_reader_app    -> Aplicación Flutter para Android, iOS y Web orientada al usuario cliente.
```

Aunque cada proyecto tiene responsabilidades separadas, los tres comparten contratos, reglas y flujos. Un cambio en la API puede requerir ajustes en React Admin y Flutter, especialmente cuando afecte endpoints, autenticación, permisos, modelos de datos, validaciones, estados de negocio o formato de respuestas.

## Ubicación local de proyectos

En el entorno local actual, los proyectos se encuentran en:

```text
C:\xampp\htdocs\english_reader_api    -> Backend NestJS y API.
C:\xampp\htdocs\english_reader_admin  -> Panel administrativo React.
C:\xampp\htdocs\english_reader_app    -> Aplicación Flutter.
```

## Regla de impacto cruzado

Antes de implementar cambios en este proyecto, se debe revisar si el ajuste afecta a:

- `english_reader_admin`, cuando el cambio impacte pantallas administrativas, formularios, menús, permisos o consumo de endpoints.
- `english_reader_app`, cuando el cambio impacte lectura de historias, autenticación, consulta de palabras, vocabulario, progreso o respuestas consumidas por Flutter.

Cada documento de planificación debe indicar, cuando corresponda, qué otros proyectos se ven involucrados.

## Documentos complementarios en otros proyectos

La planificación de interfaz, experiencia de usuario y despliegue de clientes se documenta en sus propios proyectos.

React Admin:

```text
english_reader_admin/docs/planning/01-arquitectura-admin.md
english_reader_admin/docs/planning/02-patron-crud-ui.md
english_reader_admin/docs/planning/03-diseno-interfaz-admin.md
english_reader_admin/docs/planning/04-integracion-api-admin.md
english_reader_admin/docs/planning/05-operacion-despliegue-admin.md
```

Flutter:

```text
english_reader_app/docs/planning/01-arquitectura-flutter.md
english_reader_app/docs/planning/02-experiencia-lectura.md
english_reader_app/docs/planning/03-integracion-api-flutter.md
english_reader_app/docs/planning/04-operacion-despliegue-flutter.md
english_reader_app/docs/planning/05-pruebas-calidad-flutter.md
english_reader_app/docs/planning/06-librerias-dependencias-flutter.md
english_reader_app/docs/planning/07-estado-bloc-provider.md
english_reader_app/docs/planning/08-sesion-seguridad-dispositivo.md
english_reader_app/docs/planning/09-navegacion-experiencia-usuario.md
english_reader_app/docs/planning/10-estandares-codigo-flutter.md
```

## Documentos

1. `01-arquitectura-api.md`
   - Define la arquitectura general del backend NestJS.
   - Describe responsabilidades, módulos, capas, flujo de ejecución y relación con React Admin y Flutter.
   - Menciona roles solo a nivel arquitectónico.

2. `02-seguridad-autenticacion-autorizacion.md`
   - Define login, tokens, refresh tokens, roles, permisos, guards, políticas de acceso y auditoría de acciones sensibles.
   - Mantiene las tablas y campos exactos como responsabilidad de `03-modelo-base-datos.md`.

3. `03-modelo-base-datos.md`
   - Define tablas propuestas, campos, relaciones, índices, criterios de migración y compatibilidad inicial con MySQL/MariaDB.
   - Mantiene reglas detalladas de negocio como responsabilidad de `04-logica-negocio.md`.

4. `04-logica-negocio.md`
   - Define reglas de historias, niveles, palabras, traducciones, vocabulario, progreso de lectura y revisión administrativa.
   - Mantiene rutas y contratos HTTP como responsabilidad de `05-api-endpoints.md`.

5. `05-api-endpoints.md`
   - Define estándares de rutas, contratos request/response, paginación, filtros, errores, validaciones y CRUD consumidos por React Admin y Flutter.
   - Mantiene el diseño visual de formularios y tablas como responsabilidad de `english_reader_admin`.

6. `06-integraciones-externas.md`
   - Define integración con diccionario, traducción, texto a voz, carga de archivos, protección de recursos, optimización de imágenes y estrategia de caché.

7. `07-operacion-y-despliegue.md`
   - Define variables de entorno, ambientes, logs, monitoreo, despliegue, backups, cron y retención de registros.

8. `08-estandares-codigo.md`
   - Define convenciones de comentarios, estilo, documentación interna y criterios de legibilidad para futuras implementaciones NestJS.

9. `09-pruebas-calidad.md`
   - Define estrategia de pruebas unitarias, integración, E2E con Playwright, validaciones, permisos, transacciones y regresión.

## Regla de separación

Cada documento debe tener un alcance claro. No se deben mezclar estructura, base de datos, seguridad, reglas de negocio y diseño visual dentro de un único archivo.

Cuando un tema pertenezca a otro documento, se debe registrar como referencia o pendiente en el documento correspondiente.
