import { Module } from '@nestjs/common';
import { ReadingLevelsRepository } from './infrastructure/persistence/reading-levels.repository';
import { ReadingLevelsController } from './presentation/http/reading-levels.controller';
import {
  CreateReadingLevelUseCase,
  DeleteReadingLevelUseCase,
  GetReadingLevelUseCase,
  ListReadingLevelsUseCase,
  UpdateReadingLevelUseCase,
} from './application/use-cases/reading-levels.use-cases';

/** CRUD administrativo de niveles de lectura. */
@Module({
  controllers: [ReadingLevelsController],
  providers: [
    ReadingLevelsRepository,
    ListReadingLevelsUseCase,
    GetReadingLevelUseCase,
    CreateReadingLevelUseCase,
    UpdateReadingLevelUseCase,
    DeleteReadingLevelUseCase,
  ],
  exports: [ReadingLevelsRepository],
})
export class ReadingLevelsModule {}
