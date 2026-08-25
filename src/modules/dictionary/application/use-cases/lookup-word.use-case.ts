import { Injectable } from '@nestjs/common';
import { DictionaryMessages } from '@/common/constants/messages.constants';
import { AppException } from '@/common/exceptions/app.exception';
import { isLookupableWord, normalizeWord } from '@/common/utils/word-normalizer.util';
import { DictionaryRepository } from '../../infrastructure/persistence/dictionary.repository';
import { DictionaryApiProvider } from '../../infrastructure/providers/dictionary-api.provider';
import { LibreTranslateProvider } from '../../infrastructure/providers/libre-translate.provider';
import { toWordLookupResponse } from '../../domain/word-entry.mapper';
import type { WordLookupQueryDto } from '../dto';

/** Consulta una palabra desde caché local y, si falta, la crea desde proveedores externos. */
@Injectable()
export class LookupWordUseCase {
  constructor(
    private readonly repository: DictionaryRepository,
    private readonly dictionaryProvider: DictionaryApiProvider,
    private readonly translationProvider: LibreTranslateProvider,
  ) {}

  async execute(query: WordLookupQueryDto, userId: string) {
    const normalizedWord = normalizeWord(query.word);

    if (!isLookupableWord(normalizedWord)) {
      throw AppException.validation(DictionaryMessages.InvalidWord, [
        { field: 'word', message: DictionaryMessages.InvalidWord },
      ]);
    }

    const language = query.language ?? 'en';
    const targetLanguage = query.targetLanguage ?? 'es';
    const cached = await this.repository.findByNormalized(normalizedWord, language);

    if (cached) {
      const saved = await this.repository.findSavedWord(userId, cached.id);
      return toWordLookupResponse(cached, saved?.id ?? null);
    }

    const candidate = await this.dictionaryProvider.lookup(normalizedWord, language);

    if (!candidate) {
      throw AppException.notFound(DictionaryMessages.WordNotFound);
    }

    const translation = await this.translationProvider.translateWord(
      candidate.word,
      language,
      targetLanguage,
    );

    const created = await this.repository.createFromLookup(
      candidate,
      translation ? [translation] : [],
    );
    const saved = await this.repository.findSavedWord(userId, created.id);

    return toWordLookupResponse(created, saved?.id ?? null);
  }
}
