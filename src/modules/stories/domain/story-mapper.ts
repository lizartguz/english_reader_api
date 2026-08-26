import type { Prisma } from '@/generated/prisma/client';
import type {
  AppStoryDetailResponseDto,
  AppStoryListItemResponseDto,
  StoryDetailResponseDto,
  StoryListItemResponseDto,
} from '@/modules/stories/application/dto/story-response.dto';

/** Proyección de una historia con su nivel y géneros, sin el contenido. */
export const STORY_LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  author: true,
  summary: true,
  status: true,
  estimatedReadingMinutes: true,
  sortOrder: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  readingLevel: { select: { id: true, code: true, name: true } },
  genres: { select: { genre: { select: { id: true, code: true, name: true } } } },
} satisfies Prisma.StorySelect;

/** Recursos vigentes de una historia. Lo consumen tanto el panel como Flutter. */
const STORY_ASSETS_SELECT = {
  where: { deletedAt: null },
  orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  select: {
    id: true,
    type: true,
    originalFileName: true,
    mimeType: true,
    fileSizeBytes: true,
    accessScope: true,
    metadata: true,
    sortOrder: true,
  },
} satisfies Prisma.Story$assetsArgs;

/**
 * Igual que el listado, más el contenido completo y los recursos asociados:
 * el panel necesita saber qué archivos tiene ya cargados la historia.
 */
export const STORY_DETAIL_SELECT = {
  ...STORY_LIST_SELECT,
  content: true,
  assets: STORY_ASSETS_SELECT,
} satisfies Prisma.StorySelect;

export const APP_STORY_LIST_SELECT = {
  ...STORY_LIST_SELECT,
  assets: STORY_ASSETS_SELECT,
} satisfies Prisma.StorySelect;

export const APP_STORY_DETAIL_SELECT = {
  ...APP_STORY_LIST_SELECT,
  content: true,
} satisfies Prisma.StorySelect;

export type StoryListRow = Prisma.StoryGetPayload<{ select: typeof STORY_LIST_SELECT }>;
export type StoryDetailRow = Prisma.StoryGetPayload<{ select: typeof STORY_DETAIL_SELECT }>;
export type AppStoryListRow = Prisma.StoryGetPayload<{ select: typeof APP_STORY_LIST_SELECT }>;
export type AppStoryDetailRow = Prisma.StoryGetPayload<{ select: typeof APP_STORY_DETAIL_SELECT }>;

/** Aplana la relación `genres -> genre` a una lista simple de referencias. */
function mapGenres(row: StoryListRow) {
  return row.genres.map((entry) => entry.genre);
}

/** Convierte una fila de base de datos a la forma expuesta en los listados. */
export function toStoryListItem(row: StoryListRow): StoryListItemResponseDto {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    author: row.author,
    summary: row.summary,
    status: row.status,
    estimatedReadingMinutes: row.estimatedReadingMinutes,
    sortOrder: row.sortOrder,
    publishedAt: row.publishedAt,
    readingLevel: row.readingLevel,
    genres: mapGenres(row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Convierte una fila de base de datos a la forma expuesta en el detalle. */
export function toStoryDetail(row: StoryDetailRow): StoryDetailResponseDto {
  return { ...toStoryListItem(row), content: row.content, assets: row.assets.map(toStoryAsset) };
}

function toStoryAsset(row: AppStoryListRow['assets'][number]) {
  return {
    id: row.id,
    type: row.type,
    originalFileName: row.originalFileName,
    mimeType: row.mimeType,
    fileSizeBytes: row.fileSizeBytes,
    accessScope: row.accessScope,
    metadata: row.metadata,
    sortOrder: row.sortOrder,
    downloadUrl: `/api/v1/files/story-assets/${row.id}`,
  };
}

/** Convierte una historia publicada a la forma liviana que consume Flutter. */
export function toAppStoryListItem(row: AppStoryListRow): AppStoryListItemResponseDto {
  return { ...toStoryListItem(row), assets: row.assets.map(toStoryAsset) };
}

/** Convierte una historia publicada completa para la pantalla de lectura. */
export function toAppStoryDetail(row: AppStoryDetailRow): AppStoryDetailResponseDto {
  return { ...toAppStoryListItem(row), content: row.content };
}
