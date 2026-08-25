import { Module } from '@nestjs/common';
import { FilesRepository } from './infrastructure/persistence/files.repository';
import { LocalFileStorageService } from './infrastructure/storage/local-file-storage.service';
import {
  DeleteStoryAssetUseCase,
  GetStoryAssetFileUseCase,
  UploadStoryAssetUseCase,
} from './application/use-cases';
import {
  AdminStoryAssetsController,
  StoryAssetFilesController,
} from './presentation/http/story-assets.controller';

/** Módulo de carga y entrega protegida de recursos de historias. */
@Module({
  controllers: [AdminStoryAssetsController, StoryAssetFilesController],
  providers: [
    FilesRepository,
    LocalFileStorageService,
    UploadStoryAssetUseCase,
    GetStoryAssetFileUseCase,
    DeleteStoryAssetUseCase,
  ],
})
export class FilesModule {}
