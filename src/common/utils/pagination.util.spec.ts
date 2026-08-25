import { buildOrderBy, buildPaginationMeta, normalizePagination } from './pagination.util';
import { PAGINATION } from '@/common/constants/pagination.constants';
import { SortOrder } from '@/common/enums/sort-order.enum';

describe('normalizePagination', () => {
  it('aplica los valores por defecto', () => {
    expect(normalizePagination()).toEqual({
      page: PAGINATION.DefaultPage,
      limit: PAGINATION.DefaultLimit,
      skip: 0,
      take: PAGINATION.DefaultLimit,
    });
  });

  it('calcula el desplazamiento a partir de la página', () => {
    expect(normalizePagination(3, 10)).toMatchObject({ skip: 20, take: 10 });
  });

  it('nunca permite una página menor que 1', () => {
    expect(normalizePagination(-5, 10).page).toBe(1);
  });

  it('recorta el límite al máximo permitido', () => {
    expect(normalizePagination(1, 5000).limit).toBe(PAGINATION.MaxLimit);
  });
});

describe('buildPaginationMeta', () => {
  it('calcula el total de páginas y la navegación', () => {
    expect(buildPaginationMeta(45, 2, 20)).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it('marca la última página sin siguiente', () => {
    expect(buildPaginationMeta(40, 2, 20)).toMatchObject({
      totalPages: 2,
      hasNextPage: false,
    });
  });

  it('maneja el conjunto vacío', () => {
    expect(buildPaginationMeta(0, 1, 20)).toMatchObject({
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });
});

describe('buildOrderBy', () => {
  const allowed = ['createdAt', 'title'] as const;

  it('usa el campo solicitado cuando está permitido', () => {
    expect(buildOrderBy('title', SortOrder.Asc, allowed, 'createdAt')).toEqual({ title: 'asc' });
  });

  it('ignora campos no permitidos para evitar ordenamientos arbitrarios', () => {
    expect(buildOrderBy('passwordHash', SortOrder.Asc, allowed, 'createdAt')).toEqual({
      createdAt: 'asc',
    });
  });

  it('ordena de forma descendente por defecto', () => {
    expect(buildOrderBy(undefined, undefined, allowed, 'createdAt')).toEqual({
      createdAt: 'desc',
    });
  });
});
