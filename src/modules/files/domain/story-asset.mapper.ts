import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Prisma } from '@/generated/prisma/client';
import { FileAccessScope, StoryAssetType } from '@/common/enums/domain.enums';

export const STORY_ASSET_SELECT = {
  id: true,
  storyId: true,
  type: true,
  originalFileName: true,
  mimeType: true,
  fileSizeBytes: true,
  accessScope: true,
  metadata: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StoryAssetSelect;

export const STORY_ASSET_FILE_SELECT = {
  ...STORY_ASSET_SELECT,
  storageDisk: true,
  storagePath: true,
  deletedAt: true,
  story: { select: { id: true, status: true, deletedAt: true } },
} satisfies Prisma.StoryAssetSelect;

export type StoryAssetRow = Prisma.StoryAssetGetPayload<{ select: typeof STORY_ASSET_SELECT }>;
export type StoryAssetFileRow = Prisma.StoryAssetGetPayload<{
  select: typeof STORY_ASSET_FILE_SELECT;
}>;

/** Recurso de historia visible por API sin rutas internas de almacenamiento. */
export class StoryAssetResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  storyId!: string;

  @ApiProperty({ enum: StoryAssetType })
  type!: StoryAssetType;

  @ApiPropertyOptional({ nullable: true })
  originalFileName!: string | null;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  fileSizeBytes!: number;

  @ApiProperty({ enum: FileAccessScope })
  accessScope!: FileAccessScope;

  @ApiPropertyOptional({ nullable: true })
  metadata!: unknown;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  downloadUrl!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

/** Construye el contrato seguro del recurso sin filtrar `storagePath`. */
export function toStoryAssetResponse(row: StoryAssetRow): StoryAssetResponseDto {
  return {
    id: row.id,
    storyId: row.storyId,
    type: row.type,
    originalFileName: row.originalFileName,
    mimeType: row.mimeType,
    fileSizeBytes: row.fileSizeBytes,
    accessScope: row.accessScope,
    metadata: row.metadata,
    sortOrder: row.sortOrder,
    downloadUrl: `/api/v1/files/story-assets/${row.id}`,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
