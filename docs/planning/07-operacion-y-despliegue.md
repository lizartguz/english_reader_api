# Operación y despliegue - English Reader API

## Objetivo

Este documento define criterios operativos para ambientes, variables de entorno, servidor, backups, cron, logs, monitoreo y retención de registros.

No implementa scripts definitivos. Sirve como guía para preparar el servidor cuando se pase a despliegue.

## Servidor objetivo

Servidor previsto:

```text
VPS con Ubuntu 24.04 LTS
```

## Estrategia de despliegue

La estrategia objetivo es desplegar la API en contenedores usando Docker Engine en el servidor.

El despliegue final será responsabilidad operativa del servidor, pero el proyecto debe prepararse para ejecutarse correctamente en contenedor.

Recomendaciones:

- usar imagen base explícita de Node.js, no `latest`
- usar build multi-stage para separar instalación, compilación y runtime
- copiar solo archivos necesarios al contenedor final
- excluir `node_modules`, logs, archivos temporales y secretos mediante `.dockerignore`
- ejecutar el proceso con usuario no root cuando sea posible
- exponer solo el puerto interno necesario
- leer configuración desde variables de entorno
- no incluir `.env` dentro de la imagen
- montar archivos privados en volumen o almacenamiento externo protegido
- enviar logs a salida estándar o a la estrategia definida por el servidor

Docker recomienda prácticas como multi-stage builds, elegir bien la imagen base y excluir archivos innecesarios con `.dockerignore`.

Referencia: https://docs.docker.com/build/building/best-practices/

La implementación vigente incluye `Dockerfile`, `docker-compose.yml` y
`.dockerignore` como base operativa del backend. El despliegue final debe
inyectar secretos reales desde el servidor y conservar volúmenes persistentes
para MariaDB y archivos privados.

## Servicios relacionados en contenedores

En producción, la API puede convivir con servicios relacionados:

```text
english_reader_api
database
reverse_proxy
storage_private_volume
```

La base de datos puede ejecutarse en contenedor o como servicio administrado/instalado en servidor, según la decisión operativa final.

Los backups deben diseñarse considerando dónde viven realmente los datos persistentes.

## Ambientes

Ambientes esperados:

```text
development
staging
production
```

Cada ambiente debe tener variables separadas y secretos propios.

## Entorno local de desarrollo

Durante la etapa inicial de implementación se trabajará en entorno local de
desarrollo.

Base de datos local:

```text
database: english_reader_db
host: localhost
port: 3307
user: root
password: vacío
```

Cadena conceptual para Prisma/MySQL:

```text
DATABASE_URL="mysql://root:@localhost:3307/english_reader_db"
```

Regla de trabajo local:

- la base de datos local puede eliminarse y recrearse cuando sea necesario
- las migraciones pueden resetearse en desarrollo para garantizar consistencia
- los seeders pueden ejecutarse varias veces durante pruebas locales
- esta libertad aplica solo a `development`
- nunca se debe aplicar esta regla en `staging` o `production`

Objetivo:

```text
mantener el entorno local limpio, reproducible y fácil de validar
```

Cuando se implemente, los comandos de reset, migración y seed deben apuntar
explícitamente al ambiente de desarrollo para evitar daños accidentales en otros
ambientes.

## Variables de entorno

Variables esperadas:

```text
APP_ENV
APP_URL
PORT
DATABASE_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
CORS_ORIGINS
MAIL_HOST
MAIL_PORT
MAIL_USERNAME
MAIL_PASSWORD
MAIL_FROM_ADDRESS
MAIL_FROM_NAME
MAIL_SECURE
STORAGE_DISK
STORAGE_PRIVATE_PATH
EXTERNAL_DICTIONARY_URL
EXTERNAL_TRANSLATION_URL
```

Los secretos no deben versionarse.

En Docker, estas variables deben inyectarse al contenedor desde el servidor, archivo de entorno seguro, orquestador o mecanismo equivalente.

## Backups

Los backups se realizarán en el servidor, no desde la aplicación.

Recomendación:

- backup automático diario de base de datos
- backup de archivos privados cargados
- retención mínima operativa definida por servidor
- almacenamiento fuera del directorio de la aplicación
- copia externa si el proyecto entra en producción real
- prueba periódica de restauración

Ejemplo conceptual para MySQL/MariaDB:

```bash
mysqldump -u USER -p DATABASE_NAME > /var/backups/english_reader/db/english_reader_$(date +\%F).sql
```

Ejemplo conceptual para archivos privados:

```bash
tar -czf /var/backups/english_reader/files/private_files_$(date +\%F).tar.gz /ruta/privada/de/archivos
```

Estos comandos deben ajustarse con rutas, usuario, permisos y estrategia real del servidor.

Si la base de datos corre en contenedor, el backup debe ejecutarse contra el servicio correcto y guardar el resultado fuera del ciclo de vida del contenedor.

## Cron en Ubuntu 24.04

Cron puede usarse para ejecutar tareas programadas del servidor.

Referencia de crontab en Ubuntu 24.04 LTS: https://manpages.ubuntu.com/manpages/noble/man5/crontab.5.html

Comandos útiles:

```bash
sudo systemctl status cron
sudo crontab -e
sudo crontab -l
```

Ejemplo conceptual de backup diario a las 2:00 AM:

```cron
0 2 * * * /usr/local/bin/english-reader-backup.sh >> /var/log/english-reader-backup.log 2>&1
```

Ejemplo conceptual para limpieza diaria de logs antiguos:

```cron
30 3 * * * /usr/local/bin/english-reader-cleanup.sh >> /var/log/english-reader-cleanup.log 2>&1
```

## Retención de logs

Los registros técnicos en `system_logs` deben conservarse por seis meses.

Política:

```text
mantener system_logs por 6 meses
eliminar registros mayores a 6 meses mediante tarea programada
```

La limpieza debe ejecutarse con cron o scheduler del backend, según se decida en implementación.

Ejemplo SQL conceptual:

```sql
DELETE FROM system_logs
WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);
```

Si se requiere conservar evidencias para auditoría legal o soporte, se debe exportar antes de eliminar.

## Retención de auditoría

`audit_logs` puede requerir una retención distinta a `system_logs`.

Recomendación inicial:

- conservar auditoría por más tiempo que logs técnicos
- definir política final antes de producción
- no eliminar auditoría sensible sin respaldo o aprobación

## Archivos privados

Los archivos cargados desde React Admin deben almacenarse fuera de rutas públicas directas.

Reglas:

- carpeta privada en servidor
- permisos de sistema operativo restringidos
- acceso mediante API autenticada
- no exponer rutas internas
- respaldar junto con base de datos

En contenedor, la ruta vigente para archivos privados es
`/app/storage/private`, montada mediante volumen persistente.

## Monitoreo

Elementos mínimos:

- contenedor de API activo
- consumo de disco
- uso de memoria y CPU
- errores frecuentes en `system_logs`
- fallos de backups
- estado de base de datos
- reinicios inesperados del contenedor

## Pendientes de definición

- Definir proveedor de VPS final.
- Definir herramienta de proceso para Node.js.
- Definir estrategia exacta de backups externos.
- Definir política final de retención para `audit_logs`.
- Definir scripts reales de backup y limpieza.
- Definir monitoreo y alertas.

## Criterios de cierre de este documento

Este documento se considera suficiente cuando define:

- servidor objetivo
- ambientes
- variables de entorno
- backups
- cron
- retención de `system_logs`
- archivos privados
- monitoreo inicial
