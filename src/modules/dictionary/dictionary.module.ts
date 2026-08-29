import { Module } from '@nestjs/common';
import { DictionaryRepository } from './infrastructure/persistence/dictionary.repository';
import { DictionaryApiProvider } from './infrastructure/providers/dictionary-api.provider';
import { LibreTranslateProvider } from './infrastructure/providers/libre-translate.provider';
import {
  CreateAdminWordUseCase,
  CreateWordTranslationUseCase,
  DeleteAdminWordUseCase,
  DeleteWordTranslationUseCase,
  GetAdminWordUseCase,
  GetPronunciationAudioUseCase,
  ListAdminWordsUseCase,
  ListTranslationsUseCase,
  ListWordTranslationsUseCase,
  LookupWordUseCase,
  ReviewAdminWordUseCase,
  ReviewWordTranslationUseCase,
  UpdateAdminWordUseCase,
  UpdateWordTranslationUseCase,
} from './application/use-cases';
import { FilesModule } from '@/modules/files/files.module';
import { AppWordsController } from './presentation/http/app-words.controller';
import {
  AdminTranslationsController,
  AdminWordsController,
} from './presentation/http/admin-words.controller';

/** Módulo de consulta y caché de palabras para la app móvil. */
@Module({
  imports: [FilesModule],
  controllers: [AppWordsController, AdminWordsController, AdminTranslationsController],
  providers: [
    DictionaryRepository,
    DictionaryApiProvider,
    LibreTranslateProvider,
    LookupWordUseCase,
    GetPronunciationAudioUseCase,
    ListAdminWordsUseCase,
    GetAdminWordUseCase,
    CreateAdminWordUseCase,
    UpdateAdminWordUseCase,
    ReviewAdminWordUseCase,
    DeleteAdminWordUseCase,
    ListTranslationsUseCase,
    ListWordTranslationsUseCase,
    CreateWordTranslationUseCase,
    UpdateWordTranslationUseCase,
    ReviewWordTranslationUseCase,
    DeleteWordTranslationUseCase,
  ],
})
export class DictionaryModule {}
