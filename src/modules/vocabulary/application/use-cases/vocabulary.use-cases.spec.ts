import { HttpStatus } from '@nestjs/common';
import { PartOfSpeech, ReviewStatus, SavedWordStatus } from '@/common/enums/domain.enums';
import type { SavedWordWithDetails } from '../../domain/vocabulary.mapper';
import { VocabularyRepository } from '../../infrastructure/persistence/vocabulary.repository';
import {
  ListVocabularyUseCase,
  RemoveVocabularyUseCase,
  SaveVocabularyUseCase,
  UpdateVocabularyUseCase,
} from './vocabulary.use-cases';

describe('VocabularyUseCases', () => {
  let repository: jest.Mocked<VocabularyRepository>;

  beforeEach(() => {
    repository = {
      list: jest.fn(),
      save: jest.fn(),
      findByIdForUser: jest.fn(),
      updateForUser: jest.fn(),
      softDeleteForUser: jest.fn(),
    } as unknown as jest.Mocked<VocabularyRepository>;
  });

  it('lista vocabulario con paginación y marca las palabras como guardadas', async () => {
    const item = buildSavedWord();
    repository.list.mockResolvedValue({ items: [item], total: 1 });

    const useCase = new ListVocabularyUseCase(repository);
    const result = await useCase.execute('user-1', { page: 1, limit: 10, order: 'desc' });

    expect(repository.list).toHaveBeenCalledWith(
      'user-1',
      { search: undefined, status: undefined },
      { skip: 0, take: 10 },
      { field: undefined, order: 'desc' },
    );
    expect(result.items[0]?.word.isSaved).toBe(true);
    expect(result.meta.total).toBe(1);
  });

  it('devuelve el registro existente cuando la palabra ya estaba guardada', async () => {
    const item = buildSavedWord();
    repository.save.mockResolvedValue({ item, alreadySaved: true });

    const useCase = new SaveVocabularyUseCase(repository);
    const result = await useCase.execute('user-1', { wordEntryId: 'word-1' });

    expect(result.alreadySaved).toBe(true);
    expect(result.item.id).toBe('saved-1');
    expect(result.item.word.savedWordId).toBe('saved-1');
  });

  it('rechaza el guardado cuando la palabra o historia no existe', async () => {
    repository.save.mockResolvedValue({ item: null, alreadySaved: false });

    const useCase = new SaveVocabularyUseCase(repository);

    await expect(useCase.execute('user-1', { wordEntryId: 'word-404' })).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('actualiza estado y notas solo si el registro pertenece al usuario', async () => {
    const current = buildSavedWord();
    const updated = buildSavedWord({ status: SavedWordStatus.learned, notes: 'Dominada' });
    repository.findByIdForUser.mockResolvedValue(current);
    repository.updateForUser.mockResolvedValue(updated);

    const useCase = new UpdateVocabularyUseCase(repository);
    const result = await useCase.execute('saved-1', 'user-1', {
      status: SavedWordStatus.learned,
      notes: 'Dominada',
    });

    expect(repository.findByIdForUser).toHaveBeenCalledWith('saved-1', 'user-1');
    expect(result.status).toBe(SavedWordStatus.learned);
    expect(result.notes).toBe('Dominada');
  });

  it('elimina lógicamente un registro del usuario autenticado', async () => {
    repository.findByIdForUser.mockResolvedValue(buildSavedWord());
    repository.softDeleteForUser.mockResolvedValue({ id: 'saved-1', userId: 'user-1' });

    const useCase = new RemoveVocabularyUseCase(repository);

    await expect(useCase.execute('saved-1', 'user-1')).resolves.toBeUndefined();
    expect(repository.softDeleteForUser).toHaveBeenCalledWith('saved-1', 'user-1');
  });
});

function buildSavedWord(
  overrides: Partial<Pick<SavedWordWithDetails, 'status' | 'notes'>> = {},
): SavedWordWithDetails {
  const now = new Date('2026-08-25T00:00:00.000Z');

  return {
    id: 'saved-1',
    userId: 'user-1',
    wordEntryId: 'word-1',
    storyId: 'story-1',
    status: overrides.status ?? SavedWordStatus.saved,
    notes: overrides.notes ?? null,
    savedAt: now,
    lastReviewedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    story: { id: 'story-1', title: 'A Small Story', slug: 'a-small-story' },
    wordEntry: {
      id: 'word-1',
      word: 'beautiful',
      normalizedWord: 'beautiful',
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
      examples: [],
      pronunciations: [],
      translations: [
        {
          id: 'translation-1',
          wordEntryId: 'word-1',
          targetLanguage: 'es',
          translation: 'hermoso',
          meaningContext: null,
          source: 'libretranslate',
          reviewStatus: ReviewStatus.pending,
          reviewedByUserId: null,
          reviewedAt: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
      ],
    },
  };
}
