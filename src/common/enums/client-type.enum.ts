/**
 * Tipo de cliente que consume la API.
 *
 * Determina cómo se entrega el refresh token: el panel web lo recibe en una
 * cookie `HttpOnly` y la aplicación móvil lo recibe en el cuerpo de la
 * respuesta para guardarlo en almacenamiento seguro del dispositivo.
 */
export enum ClientType {
  Web = 'web',
  Mobile = 'mobile',
}
