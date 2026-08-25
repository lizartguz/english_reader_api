import { HttpStatus } from '@nestjs/common';
import { DictionaryMessages } from '@/common/constants/messages.constants';
import { PartOfSpeech, ReviewStatus } from '@/common/enums/domain.enums';
import { ErrorCode } from '@/common/constants/error-codes.constants';
import { AppException } from '@/common/exceptions/app.exception';
import type { DictionaryLookupCandidate } from '../../domain/dictionary-provider.types';
import type { WordEntryWithDetails } from '../../domain/word-entry.mapper';
import { DictionaryRepository } from '../../infrastructure/persistence/dictionary.repository';
import { DictionaryApiProvider } from '../../infrastructure/providers/dictionary-api.provider';
import { LibreTranslateProvider } from '../../infrastructure/providers/libre-translate.provider';
import { LookupWordUseCase } from './lookup-word.use-case';

describe('LookupWordUseCase', () => {
  let repository: jest.Mocked<DictionaryRepository>;
  let dictionaryProvider: jest.Mocked<DictionaryApiProvider>;
  let translationProvider: jest.Mocked<LibreTranslateProvider>;
  let useCase: LookupWordUseCase;

  beforeEach(() => {
    repository = {
      findByNormalized: jest.fn(),
      findSavedWord: jest.fn(),
      createFromLookup: jest.fn(),
    } as unknown as jest.Mocked<DictionaryRepository>;

    dictionaryProvider = {
      lookup: jest.fn(),
    } as unknown as jest.Mocked<DictionaryApiProvider>;

    translationProvider = {
      translateWord: jest.fn(),
    } as unknown as jest.Mocked<LibreTranslateProvider>;

    useCase = new LookupWordUseCase(repository, dictionaryProvider, translationProvider);
  });

  it('devuelve la palabra desde caché sin consultar proveedores externos', async () => {
    const cached = buildWordEntry({ normalizedWord: 'beautiful' });
    repository.findByNormalized.mockResolvedValue(cached);
    repository.findSavedWord.mockResolvedValue({ id: 'saved-1' });

    const result = await useCase.execute(
      { word: 'Beautiful.', language: 'en', targetLanguage: 'es' },
      'user-1',
    );

    expect(repository.findByNormalized).toHaveBeenCalledWith('beautiful', 'en');
    expect(dictionaryProvider.lookup).not.toHaveBeenCalled();
    expect(translationProvider.translateWord).not.toHaveBeenCalled();
    expect(result.normalizedWord).toBe('beautiful');
    expect(result.isSaved).toBe(true);
    expect(result.savedWordId).toBe('saved-1');
  });

  it('consulta proveedores y guarda la palabra cuando no existe en caché', async () => {
    const candidate = buildCandidate();
    const created = buildWordEntry({ normalizedWord: 'beautiful', translations: ['hermoso'] });
    repository.findByNormalized.mockResolvedValue(null);
    repository.findSavedWord.mockResolvedValue(null);
    dictionaryProvider.lookup.mockResolvedValue(candidate);
    translationProvider.translateWord.mockResolvedValue({
      targetLanguage: 'es',
      translation: 'hermoso',
      source: 'libretranslate',
    });
    repository.createFromLookup.mockResolvedValue(created);

    const result = await useCase.execute(
      { word: ' beautiful ', language: 'en', targetLanguage: 'es' },
      'user-1',
    );

    expect(dictionaryProvider.lookup).toHaveBeenCalledWith('beautiful', 'en');
    expect(translationProvider.translateWord).toHaveBeenCalledWith('beautiful', 'en', 'es');
    expect(repository.createFromLookup).toHaveBeenCalledWith(candidate, [
      { targetLanguage: 'es', translation: 'hermoso', source: 'libretranslate' },
    ]);
    expect(result.translations[0]?.translation).toBe('hermoso');
    expect(result.isSaved).toBe(false);
  });

  it('guarda datos parciales si la traducción no está disponible', async () => {
    const candidate = buildCandidate();
    const created = buildWordEntry({ normalizedWord: 'beautiful', translations: [] });
    repository.findByNormalized.mockResolvedValue(null);
    repository.findSavedWord.mockResolvedValue(null);
    dictionaryProvider.lookup.mockResolvedValue(candidate);
    translationProvider.translateWord.mockResolvedValue(null);
    repository.createFromLookup.mockResolvedValue(created);

    const result = await useCase.execute(
      { word: 'beautiful', language: 'en', targetLanguage: 'es' },
      'user-1',
    );

    expect(repository.createFromLookup).toHaveBeenCalledWith(candidate, []);
    expect(result.definitionEn).toBe('Pleasing the senses or mind aesthetically.');
    expect(result.translations).toEqual([]);
  });

  it('rechaza palabras no consultables sin llamar al proveedor', async () => {
    await expect(
      useCase.execute({ word: '...', language: 'en', targetLanguage: 'es' }, 'user-1'),
    ).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
    });

    expect(repository.findByNormalized).not.toHaveBeenCalled();
    expect(dictionaryProvider.lookup).not.toHaveBeenCalled();
  });

  it('responde 404 cuando el proveedor no encuentra la palabra', async () => {
    repository.findByNormalized.mockResolvedValue(null);
    dictionaryProvider.lookup.mockResolvedValue(null);

    await expect(
      useCase.execute({ word: 'unknownword', language: 'en', targetLanguage: 'es' }, 'user-1'),
    ).rejects.toEqual(
      new AppException(DictionaryMessages.WordNotFound, ErrorCode.NotFound, HttpStatus.NOT_FOUND),
    );
  });
});

function buildCandidate(): DictionaryLookupCandidate {
  return {
    word: 'beautiful',
    normalizedWord: 'beautiful',
    language: 'en',
    phonetic: '/bjuːtɪfəl/',
    definitionEn: 'Pleasing the senses or mind aesthetically.',
    partOfSpeech: PartOfSpeech.adjective,
    source: 'dictionaryapi.dev',
    examples: [{ exampleText: 'She has a beautiful voice.', source: 'dictionaryapi.dev' }],
    pronunciations: [
      {
        phonetic: '/bjuːtɪfəl/',
        audioUrl: 'https://example.test/beautiful.mp3',
        source: 'dictionaryapi.dev',
      },
    ],
  };
}

function buildWordEntry(overrides: {
  normalizedWord: string;
  translations?: string[];
}): WordEntryWithDetails {
  const now = new Date('2026-08-25T00:00:00.000Z');

  return {
    id: 'word-1',
    word: overrides.normalizedWord,
    normalizedWord: overrides.normalizedWord,
    language: 'en',
    phonetic: '/bjuːtɪfəl/',
    definitionEn: 'Pleasing the senses or mind aesthetically.',
    partOfSpeech: PartOfSpeech.adjective,
    source: 'dictionaryapi.dev',
    reviewStatus: ReviewStatus.pending,
    reviewedByUserId: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    examples: [
      {
        id: 'example-1',
        wordEntryId: 'word-1',
        exampleText: 'She has a beautiful voice.',
        source: 'dictionaryapi.dev',
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      },
    ],
    pronunciations: [
      {
        id: 'pronunciation-1',
        wordEntryId: 'word-1',
        accent: null,
        phonetic: '/bjuːtɪfəl/',
        audioUrl: 'https://example.test/beautiful.mp3',
        source: 'dictionaryapi.dev',
        createdAt: now,
        updatedAt: now,
      },
    ],
    translations: (overrides.translations ?? ['hermoso']).map((translation, index) => ({
      id: `translation-${index + 1}`,
      wordEntryId: 'word-1',
      targetLanguage: 'es',
      translation,
      meaningContext: null,
      source: 'libretranslate',
      reviewStatus: ReviewStatus.pending,
      reviewedByUserId: null,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })),
  };
}
