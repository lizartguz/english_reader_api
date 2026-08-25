import { Module } from '@nestjs/common';
import { ReadingLevelsModule } from '@/modules/reading-levels/reading-levels.module';
import { GenresModule } from '@/modules/genres/genres.module';
import { StoriesRepository } from './infrastructure/persistence/stories.repository';
import { AppStoriesController } from './presentation/http/app-stories.controller';
import { StoriesController } from './presentation/http/stories.controller';
import {
  ChangeStoryStatusUseCase,
  CreateStoryUseCase,
  DeleteStoryUseCase,
  GetAppStoryUseCase,
  GetStoryUseCase,
  ListAppStoriesUseCase,
  ListStoriesUseCase,
  UpdateStoryUseCase,
} from './application/use-cases';

/** CRUD administrativo de historias, con géneros y niveles asociados. */
@Module({
  imports: [ReadingLevelsModule, GenresModule],
  controllers: [StoriesController, AppStoriesController],
  providers: [
    StoriesRepository,
    ListStoriesUseCase,
    GetStoryUseCase,
    ListAppStoriesUseCase,
    GetAppStoryUseCase,
    CreateStoryUseCase,
    UpdateStoryUseCase,
    ChangeStoryStatusUseCase,
    DeleteStoryUseCase,
  ],
  exports: [StoriesRepository],
})
export class StoriesModule {}
