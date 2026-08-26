import { Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService, PrismaTransaction } from '@/database/prisma.service';
import { PartOfSpeech, ReviewStatus } from '@/common/enums/domain.enums';
import { SortOrder } from '@/common/enums/sort-order.enum';
import { buildOrderBy } from '@/common/utils/pagination.util';
import {
  WORD_ENTRY_LIST_SELECT,
  WORD_ENTRY_DETAILS_INCLUDE,
  TRANSLATION_LIST_INCLUDE,
  type WordEntryListRow,
  type WordEntryWithDetails,
  type WordTranslationRow,
  type TranslationListRow,
} from '../../domain/word-entry.mapper';
import type {
  DictionaryLookupCandidate,
  TranslationCandidate,
} from '../../domain/dictionary-provider.types';
import { WORD_SORT_FIELDS, type WordSortField } from '../../application/dto/admin-word-query.dto';
import {
  TRANSLATION_SORT_FIELDS,
  type TranslationSortField,
} from '../../application/dto/translation-query.dto';

/** Filtros soportados por el listado administrativo de palabras. */
export interface WordFilters {
  search?: string;
  language?: string;
  reviewStatus?: ReviewStatus;
  partOfSpeech?: PartOfSpeech;
  source?: string;
}

/** Filtros soportados por el listado administrativo global de traducciones. */
export interface TranslationFilters {
  word?: string;
  targetLanguage?: string;
  reviewStatus?: ReviewStatus;
  source?: string;
}

/** Datos de palabra editable desde administración. */
export interface WordBaseInput {
  word: string;
  normalizedWord: string;
  language: string;
  phonetic?: string | null;
  definitionEn?: string | null;
  partOfSpeech?: PartOfSpeech | null;
  source?: string | null;
}

/** Datos relacionados al crear una palabra manualmente. */
export interface CreateWordManualInput extends WordBaseInput {
  /** Administrador que precarga la palabra; queda sellado como su revisor. */
  reviewedByUserId: string | null;
  examples?: Array<{ exampleText: string; source?: string | null; sortOrder?: number }>;
  pronunciations?: Array<{
    accent?: string | null;
    phonetic?: string | null;
    audioUrl?: string | null;
    source?: string | null;
  }>;
  translations?: TranslationCandidate[];
}

/** Acceso a datos del caché persistente de diccionario. */
@Injectable()
export class DictionaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByNormalized(normalizedWord: string, language: string, tx?: PrismaTransaction) {
    return (tx ?? this.prisma).wordEntry.findFirst({
      where: { normalizedWord, language, deletedAt: null },
      include: WORD_ENTRY_DETAILS_INCLUDE,
    });
  }

  findAnyByNormalized(normalizedWord: string, language: string) {
    return this.prisma.wordEntry.findUnique({
      where: { normalizedWord_language: { normalizedWord, language } },
      select: { id: true, deletedAt: true },
    });
  }

  findById(id: string, tx?: PrismaTransaction) {
    return (tx ?? this.prisma).wordEntry.findFirst({
      where: { id, deletedAt: null },
      include: WORD_ENTRY_DETAILS_INCLUDE,
    });
  }

  async list(
    filters: WordFilters,
    pagination: { skip: number; take: number },
    sort: { field?: string; order?: SortOrder },
  ): Promise<{ items: WordEntryListRow[]; total: number }> {
    const where = this.buildWordWhere(filters);
    const orderBy = buildOrderBy<WordSortField>(
      sort.field,
      sort.order,
      WORD_SORT_FIELDS,
      'createdAt',
    );

    const [items, total] = await Promise.all([
      this.prisma.wordEntry.findMany({
        where,
        select: WORD_ENTRY_LIST_SELECT,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.wordEntry.count({ where }),
    ]);

    return { items, total };
  }

  findSavedWord(userId: string, wordEntryId: string) {
    return this.prisma.userSavedWord.findFirst({
      where: { userId, wordEntryId, deletedAt: null },
      select: { id: true },
    });
  }

  /**
   * Persiste una palabra nueva con sus datos relacionados en una sola transacción.
   * Si otro request creó la misma palabra primero, devuelve el caché existente.
   */
  async createFromLookup(
    candidate: DictionaryLookupCandidate,
    translations: TranslationCandidate[],
  ): Promise<WordEntryWithDetails> {
    return this.prisma.runInTransaction(async (tx) => {
      const existing = await this.findByNormalized(
        candidate.normalizedWord,
        candidate.language,
        tx,
      );

      if (existing) return existing;

      const created = await tx.wordEntry.create({
        data: {
          word: candidate.word,
          normalizedWord: candidate.normalizedWord,
          language: candidate.language,
          phonetic: candidate.phonetic ?? null,
          definitionEn: candidate.definitionEn ?? null,
          partOfSpeech: candidate.partOfSpeech ?? null,
          source: candidate.source ?? null,
          reviewStatus: ReviewStatus.pending,
          examples: {
            create: candidate.examples.map((example, index) => ({
              exampleText: example.exampleText,
              source: example.source ?? null,
              sortOrder: index,
            })),
          },
          pronunciations: {
            create: candidate.pronunciations.map((pronunciation) => ({
              accent: pronunciation.accent ?? null,
              phonetic: pronunciation.phonetic ?? null,
              audioUrl: pronunciation.audioUrl ?? null,
              source: pronunciation.source ?? null,
            })),
          },
          translations: {
            create: translations.map((translation) => ({
              targetLanguage: translation.targetLanguage,
              translation: translation.translation,
              meaningContext: translation.meaningContext ?? null,
              source: translation.source ?? null,
              reviewStatus: ReviewStatus.pending,
            })),
          },
        },
        include: WORD_ENTRY_DETAILS_INCLUDE,
      });

      return created;
    });
  }

  createManual(input: CreateWordManualInput) {
    // La carga manual nace ya revisada, así que se sella el revisor y la fecha
    // en el mismo acto: un registro `reviewed` sin revisor sería incoherente.
    const reviewedAt = new Date();

    return this.prisma.wordEntry.create({
      data: {
        word: input.word,
        normalizedWord: input.normalizedWord,
        language: input.language,
        phonetic: input.phonetic ?? null,
        definitionEn: input.definitionEn ?? null,
        partOfSpeech: input.partOfSpeech ?? null,
        source: input.source ?? 'admin',
        reviewStatus: ReviewStatus.reviewed,
        reviewedByUserId: input.reviewedByUserId,
        reviewedAt,
        examples: {
          create: (input.examples ?? []).map((example, index) => ({
            exampleText: example.exampleText,
            source: example.source ?? 'admin',
            sortOrder: example.sortOrder ?? index,
          })),
        },
        pronunciations: {
          create: (input.pronunciations ?? []).map((pronunciation) => ({
            accent: pronunciation.accent ?? null,
            phonetic: pronunciation.phonetic ?? null,
            audioUrl: pronunciation.audioUrl ?? null,
            source: pronunciation.source ?? 'admin',
          })),
        },
        translations: {
          create: (input.translations ?? []).map((translation) => ({
            targetLanguage: translation.targetLanguage,
            translation: translation.translation,
            meaningContext: translation.meaningContext ?? null,
            source: translation.source ?? 'admin',
            reviewStatus: ReviewStatus.reviewed,
            reviewedByUserId: input.reviewedByUserId,
            reviewedAt,
          })),
        },
      },
      include: WORD_ENTRY_DETAILS_INCLUDE,
    });
  }

  updateWord(
    id: string,
    data: Partial<WordBaseInput> & { reviewedByUserId?: string | null; reviewedAt?: Date | null },
  ) {
    return this.prisma.wordEntry.update({
      where: { id },
      data,
      include: WORD_ENTRY_DETAILS_INCLUDE,
    });
  }

  reviewWord(id: string, reviewStatus: ReviewStatus, actorUserId: string | null) {
    return this.prisma.wordEntry.update({
      where: { id },
      data: {
        reviewStatus,
        reviewedByUserId: reviewStatus === ReviewStatus.pending ? null : actorUserId,
        reviewedAt: reviewStatus === ReviewStatus.pending ? null : new Date(),
      },
      include: WORD_ENTRY_DETAILS_INCLUDE,
    });
  }

  softDeleteWord(id: string) {
    return this.prisma.wordEntry.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }

  async listTranslationsByWord(
    wordEntryId: string,
    pagination: { skip: number; take: number },
  ): Promise<{ items: WordTranslationRow[]; total: number }> {
    const where = { wordEntryId, deletedAt: null };

    const [items, total] = await Promise.all([
      this.prisma.wordTranslation.findMany({
        where,
        orderBy: [{ reviewStatus: 'asc' }, { createdAt: 'desc' }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.wordTranslation.count({ where }),
    ]);

    return { items, total };
  }

  /** Listado global de traducciones para `GET /admin/translations`, con su palabra asociada. */
  async listTranslations(
    filters: TranslationFilters,
    pagination: { skip: number; take: number },
    sort: { field?: string; order?: SortOrder },
  ): Promise<{ items: TranslationListRow[]; total: number }> {
    const where = this.buildTranslationWhere(filters);
    const orderBy = buildOrderBy<TranslationSortField>(
      sort.field,
      sort.order,
      TRANSLATION_SORT_FIELDS,
      'createdAt',
    );

    const [items, total] = await Promise.all([
      this.prisma.wordTranslation.findMany({
        where,
        include: TRANSLATION_LIST_INCLUDE,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.wordTranslation.count({ where }),
    ]);

    return { items, total };
  }

  findTranslationById(id: string) {
    return this.prisma.wordTranslation.findFirst({ where: { id, deletedAt: null } });
  }

  createTranslation(wordEntryId: string, data: TranslationCandidate) {
    return this.prisma.wordTranslation.create({
      data: {
        wordEntryId,
        targetLanguage: data.targetLanguage,
        translation: data.translation,
        meaningContext: data.meaningContext ?? null,
        source: data.source ?? 'admin',
        reviewStatus: ReviewStatus.reviewed,
      },
    });
  }

  updateTranslation(
    id: string,
    data: Partial<{
      targetLanguage: string;
      translation: string;
      meaningContext: string | null;
      source: string | null;
    }>,
  ) {
    return this.prisma.wordTranslation.update({ where: { id }, data });
  }

  reviewTranslation(id: string, reviewStatus: ReviewStatus, actorUserId: string | null) {
    return this.prisma.wordTranslation.update({
      where: { id },
      data: {
        reviewStatus,
        reviewedByUserId: reviewStatus === ReviewStatus.pending ? null : actorUserId,
        reviewedAt: reviewStatus === ReviewStatus.pending ? null : new Date(),
      },
    });
  }

  softDeleteTranslation(id: string) {
    return this.prisma.wordTranslation.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }

  private buildTranslationWhere(filters: TranslationFilters): Prisma.WordTranslationWhereInput {
    return {
      deletedAt: null,
      wordEntry: { deletedAt: null },
      ...(filters.targetLanguage ? { targetLanguage: filters.targetLanguage } : {}),
      ...(filters.reviewStatus ? { reviewStatus: filters.reviewStatus } : {}),
      ...(filters.source ? { source: { contains: filters.source } } : {}),
      ...(filters.word ? { wordEntry: { deletedAt: null, word: { contains: filters.word } } } : {}),
    };
  }

  private buildWordWhere(filters: WordFilters): Prisma.WordEntryWhereInput {
    return {
      deletedAt: null,
      ...(filters.language ? { language: filters.language } : {}),
      ...(filters.reviewStatus ? { reviewStatus: filters.reviewStatus } : {}),
      ...(filters.partOfSpeech ? { partOfSpeech: filters.partOfSpeech } : {}),
      ...(filters.source ? { source: { contains: filters.source } } : {}),
      ...(filters.search
        ? {
            OR: [
              { word: { contains: filters.search } },
              { normalizedWord: { contains: filters.search } },
              { definitionEn: { contains: filters.search } },
              { translations: { some: { translation: { contains: filters.search } } } },
            ],
          }
        : {}),
    };
  }
}
