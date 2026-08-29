/**
 * Tipo de cliente que consume la API.
 *
 * Determina cómo se entrega el refresh token según el canal de cliente.
 */
export enum ClientType {
  Web = 'web',
  AppWeb = 'app_web',
  Mobile = 'mobile',
}
