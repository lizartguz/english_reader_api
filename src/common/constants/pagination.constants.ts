/** Valores por defecto y límites para los listados paginados de la API. */
export const PAGINATION = {
  DefaultPage: 1,
  DefaultLimit: 20,
  MinLimit: 1,
  /** Límite máximo permitido para evitar consultas costosas desde los clientes. */
  MaxLimit: 100,
  DefaultSortField: 'createdAt',
} as const;
