import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { FileAccessScope, StoryAssetType } from '@/common/enums/domain.enums';
import { STORY_ASSET_FILE_SELECT, STORY_ASSET_SELECT } from '../../domain/story-asset.mapper';

/** Datos persistidos al registrar un recurso de historia. */
export interface CreateStoryAssetInput {
  storyId: string;
  type: StoryAssetType;
  storageDisk: string;
  storagePath: string;
  originalFileName: string | null;
  mimeType: string;
  fileSizeBytes: number;
  accessScope: FileAccessScope;
  metadata?: unknown;
  sortOrder: number;
}

/** Acceso a datos de recursos y archivos de historias. */
@Injectable()
export class FilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findStoryForAsset(storyId: string) {
    return this.prisma.story.findFirst({
      where: { id: storyId, deletedAt: null },
      select: { id: true, title: true, status: true },
    });
  }

  createStoryAsset(data: CreateStoryAssetInput) {
    return this.prisma.storyAsset.create({ data: data as never, select: STORY_ASSET_SELECT });
  }

  findStoryAssetById(id: string) {
    return this.prisma.storyAsset.findFirst({
      where: { id, deletedAt: null },
      select: STORY_ASSET_FILE_SELECT,
    });
  }

  softDeleteStoryAsset(id: string) {
    return this.prisma.storyAsset.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: STORY_ASSET_FILE_SELECT,
    });
  }
}
