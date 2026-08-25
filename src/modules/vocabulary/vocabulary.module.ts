import { Module } from '@nestjs/common';
import { VocabularyRepository } from './infrastructure/persistence/vocabulary.repository';
import {
  ListAdminVocabularyUseCase,
  ListVocabularyUseCase,
  RemoveVocabularyUseCase,
  SaveVocabularyUseCase,
  UpdateVocabularyUseCase,
} from './application/use-cases';
import { AdminVocabularyController } from './presentation/http/admin-vocabulary.controller';
import { AppVocabularyController } from './presentation/http/app-vocabulary.controller';

/** Módulo de vocabulario personal del usuario cliente. */
@Module({
  controllers: [AppVocabularyController, AdminVocabularyController],
  providers: [
    VocabularyRepository,
    ListVocabularyUseCase,
    ListAdminVocabularyUseCase,
    SaveVocabularyUseCase,
    UpdateVocabularyUseCase,
    RemoveVocabularyUseCase,
  ],
})
export class VocabularyModule {}
