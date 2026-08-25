import { Module } from '@nestjs/common';
import { StoriesModule } from '@/modules/stories/stories.module';
import { ReadingProgressRepository } from './infrastructure/persistence/reading-progress.repository';
import {
  GetReadingProgressUseCase,
  ListAdminReadingProgressUseCase,
  SaveReadingProgressUseCase,
} from './application/use-cases';
import { AdminReadingProgressController } from './presentation/http/admin-reading-progress.controller';
import { AppReadingProgressController } from './presentation/http/app-reading-progress.controller';

/** Módulo de avance de lectura del cliente móvil. */
@Module({
  imports: [StoriesModule],
  controllers: [AppReadingProgressController, AdminReadingProgressController],
  providers: [
    ReadingProgressRepository,
    GetReadingProgressUseCase,
    SaveReadingProgressUseCase,
    ListAdminReadingProgressUseCase,
  ],
})
export class ReadingProgressModule {}
