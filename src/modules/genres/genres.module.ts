import { Module } from '@nestjs/common';
import { GenresRepository } from './infrastructure/persistence/genres.repository';
import { GenresController } from './presentation/http/genres.controller';
import {
  CreateGenreUseCase,
  DeleteGenreUseCase,
  GetGenreUseCase,
  ListGenresUseCase,
  UpdateGenreUseCase,
} from './application/use-cases/genres.use-cases';

/** CRUD administrativo de géneros literarios. */
@Module({
  controllers: [GenresController],
  providers: [
    GenresRepository,
    ListGenresUseCase,
    GetGenreUseCase,
    CreateGenreUseCase,
    UpdateGenreUseCase,
    DeleteGenreUseCase,
  ],
  exports: [GenresRepository],
})
export class GenresModule {}
