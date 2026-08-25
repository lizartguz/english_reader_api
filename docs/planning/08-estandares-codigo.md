# Estándares de código - English Reader API

## Objetivo

Este documento define reglas de estilo y documentación interna para futuras implementaciones de `english_reader_api`.

Su propósito es que el código NestJS sea legible, mantenible y fácil de entender a simple vista.

## Comentarios en español

Las funciones, métodos o clases con responsabilidad relevante deben incluir un comentario breve en español cuando ayude a entender su propósito.

No se debe comentar todo por obligación. Los comentarios deben agregarse donde aporten claridad real.

El comentario debe permitir entender rápidamente de qué trata la función sin leer toda la implementación cuando el nombre por sí solo no sea suficiente.

## Formato recomendado

En NestJS y TypeScript se usará estilo TSDoc/JSDoc:

```ts
/**
 * Valida credenciales y emite tokens para una sesión activa.
 */
async login(command: LoginCommand): Promise<AuthSessionDto> {}
```

Para clases:

```ts
/**
 * Caso de uso encargado de crear historias en estado borrador.
 */
export class CreateStoryUseCase {}
```

Para guards:

```ts
/**
 * Verifica que el usuario autenticado tenga los permisos requeridos por la ruta.
 */
export class PermissionsGuard implements CanActivate {}
```

## Criterios de redacción

Los comentarios deben ser:

- en español
- claros
- breves
- precisos
- enfocados en propósito, regla o responsabilidad

No deben ser largos salvo que documenten una regla de negocio compleja o un contrato importante.

## Qué se debe comentar

Debe comentarse cuando aporte contexto:

- controllers con responsabilidad clara
- services relevantes
- use cases
- repositories
- providers externos
- guards
- interceptors
- pipes personalizados
- DTOs con contratos importantes
- funciones privadas con lógica no obvia
- métodos que manejen transacciones
- métodos que registren auditoría o logs técnicos
- métodos relacionados con seguridad, tokens, permisos o validaciones

Cuando la lógica de negocio sea compleja, el comentario puede explicar un poco más el motivo, las restricciones o el flujo esperado.

Ejemplo:

```ts
/**
 * Consulta una palabra usando primero el caché local y solo recurre al proveedor externo
 * cuando no existe información revisada o guardada previamente.
 */
async lookupWord(command: LookupWordCommand): Promise<WordDetailDto> {}
```

## Qué no se debe comentar

No se deben agregar comentarios que solo repitan sintaxis obvia.

Evitar comentarios como:

```ts
// Guarda el usuario.
await this.userRepository.save(user);
```

Preferir comentarios que expliquen intención:

```ts
/**
 * Crea el usuario y asigna roles iniciales dentro de una misma transacción.
 */
async createWithRoles(command: CreateUserCommand): Promise<UserDto> {}
```

## Comentarios dentro de funciones

Dentro de una función, usar comentarios `//` solo cuando aclaren una decisión no obvia.

Ejemplo:

```ts
// El refresh token se guarda hasheado para que no pueda reutilizarse si la base se expone.
await this.refreshTokenRepository.storeHash(tokenHash);
```

No se deben llenar funciones con comentarios línea por línea. Los comentarios internos deben reservarse para decisiones importantes, reglas de negocio complejas o consideraciones de seguridad.

## Actualización de comentarios

Cuando una función cambie de comportamiento, su comentario debe actualizarse en el mismo cambio.

Un comentario desactualizado es peor que no tener comentario.

## Constantes, enums y textos estáticos

Se debe evitar hardcodear strings estáticos directamente en la lógica de negocio, controladores, guards, servicios o repositorios.

Los valores reutilizables deben centralizarse usando:

- enums
- constantes
- objetos de configuración
- catálogos de mensajes
- catálogos de códigos de error

Casos que deben evitar strings hardcodeados:

- roles
- permisos
- estados
- tipos de recursos
- códigos de error
- claves de configuración
- nombres de proveedores externos
- mensajes reutilizables de respuesta
- rutas internas reutilizadas

Ejemplo recomendado:

```ts
export enum UserRoleCode {
  SuperAdmin = 'SUPER_ADMIN',
  Admin = 'ADMIN',
  Client = 'CLIENT',
}
```

Ejemplo a evitar:

```ts
if (user.role === 'SUPER_ADMIN') {}
```

Preferir:

```ts
if (user.role === UserRoleCode.SuperAdmin) {}
```

Para mensajes al usuario, se deben definir constantes o catálogos reutilizables cuando el texto pueda repetirse en varias partes del sistema.

Ejemplo:

```ts
export const AuthMessages = {
  InvalidCredentials: 'Credenciales inválidas.',
  SessionExpired: 'Tu sesión ha expirado. Inicia sesión nuevamente.',
} as const;
```

No es necesario convertir en constante cada texto único y local que no se reutiliza, pero sí deben centralizarse los valores que representen reglas, estados, permisos, roles, errores o contratos.

## Imports y referencias a modelos

Cuando se use una clase, modelo, DTO, entidad, enum, interface o servicio, se debe importar al inicio del archivo usando `import`.

No se deben escribir rutas largas o referencias completas dentro de funciones, métodos o firmas cuando pueda usarse un import claro.

Este criterio es equivalente al uso de `use` en PHP.

Ejemplo recomendado:

```ts
import { Story } from '@/modules/stories/domain/entities/story.entity';
import { CreateStoryDto } from '@/modules/stories/application/dto/create-story.dto';

/**
 * Crea una historia en estado borrador para revisión administrativa.
 */
async create(dto: CreateStoryDto): Promise<Story> {}
```

Ejemplo a evitar:

```ts
async create(
  dto: import('@/modules/stories/application/dto/create-story.dto').CreateStoryDto,
): Promise<import('@/modules/stories/domain/entities/story.entity').Story> {}
```

Reglas:

- usar imports explícitos al inicio del archivo
- evitar rutas largas dentro de funciones
- evitar imports duplicados
- mantener nombres claros y consistentes
- usar aliases configurados solo si están definidos formalmente en el proyecto
- evitar imports relativos excesivamente largos cuando exista alias aprobado

Los aliases de rutas, si se usan, deben definirse de forma consistente en `tsconfig` y respetarse en todo el proyecto.

## Relación con Swagger/OpenAPI

Los comentarios de código no reemplazan la documentación de contratos API.

Swagger/OpenAPI debe documentar endpoints, requests, responses y errores.

Los comentarios internos deben explicar responsabilidades del código, reglas de negocio y decisiones de implementación.

## Criterios de cierre de este documento

Este documento se considera suficiente cuando define:

- idioma de comentarios
- formato TSDoc/JSDoc
- qué elementos comentar
- qué comentarios evitar
- cómo documentar funciones relevantes
- uso de constantes y enums para evitar strings hardcodeados
- uso correcto de imports para evitar rutas largas dentro de funciones
- relación entre comentarios internos y documentación API
