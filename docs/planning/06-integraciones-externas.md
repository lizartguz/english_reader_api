# Integraciones externas y archivos - English Reader API

## Objetivo

Este documento define criterios para servicios externos, carga de archivos, optimización de imágenes, audio, protección de recursos y estrategia de caché.

No implementa proveedores concretos. Define la planificación para que la implementación se haga de forma segura y reemplazable.

## Ecosistema relacionado

```text
english_reader_api    -> procesa, protege y entrega datos/archivos.
english_reader_admin  -> carga imágenes, audios y contenido administrativo.
english_reader_app    -> consume historias, palabras, pronunciaciones y archivos autorizados.
```

## Principios

- Flutter y React Admin no deben consumir proveedores externos directamente cuando exista regla de negocio o caché.
- Los proveedores deben encapsularse mediante adaptadores.
- La API debe responder desde base de datos o almacenamiento interno cuando ya exista información.
- Los archivos de historias deben estar protegidos por autenticación y permisos.
- No se deben exponer rutas públicas directas a imágenes o audios privados.

## Integraciones aprobadas

Integraciones base aprobadas:

| Integración         | Uso principal                                                            | Estado          |
| ------------------- | ------------------------------------------------------------------------ | --------------- |
| `dictionaryapi.dev` | Definiciones, fonética, ejemplos y audio de pronunciación cuando exista. | Aprobada        |
| `LibreTranslate`    | Traducción al español de palabras o significados.                        | Aprobada        |
| `flutter_tts`       | Texto a voz en Flutter como respaldo o reproducción local.               | Aprobada        |
| `sharp`             | Optimización, redimensionado y conversión de imágenes.                   | Aprobada        |
| `Multer`            | Carga de archivos `multipart/form-data` en NestJS.                       | Aprobada        |
| `FFmpeg`            | Conversión o normalización futura de audios.                             | Opcional futuro |

Las integraciones aprobadas deben implementarse mediante adaptadores para evitar acoplamiento directo con proveedores concretos.

## Carga de archivos en NestJS

NestJS soporta carga de archivos mediante Multer para `multipart/form-data`.

Uso planificado:

- recibir archivos desde React Admin
- validar tipo real y extensión
- validar tamaño máximo
- almacenar en ubicación protegida
- registrar metadatos en base de datos
- devolver respuestas amigables

Referencia oficial: https://docs.nestjs.com/techniques/file-upload

## Imágenes

Formatos permitidos:

```text
png
jpg
jpeg
webp
```

Tamaño máximo de entrada:

```text
10 MB
```

Reglas:

- validar extensión y MIME type
- optimizar imagen al cargarla
- reducir peso sin perder calidad visual de forma notoria
- conservar dimensiones razonables para web/app
- preferir salida WebP cuando sea conveniente
- guardar archivo en ruta protegida
- evitar acceso público directo por URL

Tecnología recomendada:

```text
sharp
```

Sharp es una librería de procesamiento de imágenes para Node.js orientada a redimensionar y convertir imágenes como JPEG, PNG y WebP. Referencia oficial: https://sharp.pixelplumbing.com/

## Audios

Formatos permitidos inicialmente:

```text
mp3
m4a
```

Tamaño máximo:

```text
15 MB
```

Recomendación:

- `mp3` por compatibilidad amplia.
- `m4a` con AAC como alternativa eficiente y compatible para reducir tamaño manteniendo calidad razonable.

No se requiere compresión automática inicial para audios. El backend debe validar tamaño, tipo y almacenamiento seguro.

FFmpeg puede considerarse más adelante si se requiere normalizar o convertir audios. FFmpeg documenta conversión y codificación de audio, incluyendo AAC/M4A. Referencia: https://ffmpeg.org/ffmpeg-codecs.html

## Protección de archivos

Las imágenes y audios cargados desde administración deben ser privados por defecto.

Reglas:

- no guardar archivos administrativos en una carpeta pública directa
- no exponer `storage_path` al cliente
- entregar archivos mediante endpoint protegido
- validar sesión y permisos antes de servir el archivo
- para almacenamiento externo, considerar URLs temporales firmadas
- registrar acceso o errores cuando sea relevante

React Admin podrá visualizar archivos solo después de autenticarse.

Flutter solo debe acceder a recursos publicados y autorizados por la API.

## Diccionario y traducción

La API debe consultar primero la base de datos.

Proveedor de diccionario aprobado:

```text
dictionaryapi.dev
```

Proveedor de traducción aprobado:

```text
LibreTranslate
```

Flujo:

```text
buscar palabra normalizada
  -> si existe, devolver datos guardados
  -> si no existe, consultar proveedor externo
  -> guardar resultado
  -> devolver respuesta
```

La información revisada manualmente por administración tiene prioridad sobre datos externos.

## Texto a voz y pronunciación

Flutter puede usar texto a voz local como respaldo.

Plugin aprobado:

```text
flutter_tts
```

La API debe entregar:

- fonética cuando exista
- audio de pronunciación cuando exista
- acento del audio
- fuente del dato

## Caché

El caché principal de palabras, traducciones, ejemplos y pronunciaciones será la base de datos.

Reglas:

- evitar consultas repetidas innecesarias a proveedores externos
- guardar fuente de cada dato
- permitir revisión manual
- manejar fallos externos con errores amigables
- registrar fallos relevantes en `system_logs`

## Definiciones vigentes de implementación

- El almacenamiento inicial es local privado mediante `STORAGE_PRIVATE_PATH`.
- Las imágenes de portada se optimizan con `sharp`, se redimensionan con
  `IMAGE_MAX_WIDTH` y se entregan como WebP usando `IMAGE_WEBP_QUALITY`.
- Los audios se validan por MIME y tamaño, pero no se convierten
  automáticamente en esta etapa.
- La entrega de recursos se hace mediante `/api/v1/files/story-assets/:id`,
  con autenticación y reglas por rol.

## Pendientes de definición

- Definir si una etapa futura migrará almacenamiento local a S3 compatible u
  otro servicio.
- Definir política de limpieza de archivos huérfanos.

## Criterios de cierre de este documento

Este documento se considera suficiente cuando define:

- proveedores externos como adaptadores
- carga de archivos
- formatos permitidos
- tamaños máximos
- optimización de imágenes
- formatos de audio
- protección de recursos
- caché de palabras y traducciones
- relación con React Admin y Flutter
