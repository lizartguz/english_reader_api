import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Prisma } from '@/generated/prisma/client';
import { ReviewStatus, PartOfSpeech } from '@/common/enums/domain.enums';

export const WORD_ENTRY_LIST_SELECT = {
  id: true,
  word: true,
  normalizedWord: true,
  language: true,
  phonetic: true,
  definitionEn: true,
  partOfSpeech: true,
  source: true,
  reviewStatus: true,
  reviewedByUserId: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { translations: true, savedByUsers: true } },
} satisfies Prisma.WordEntrySelect;

export const WORD_ENTRY_DETAILS_INCLUDE = {
  examples: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
  pronunciations: { orderBy: [{ accent: 'asc' }, { createdAt: 'asc' }] },
  translations: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.WordEntryInclude;

export type WordEntryListRow = Prisma.WordEntryGetPayload<{
  select: typeof WORD_ENTRY_LIST_SELECT;
}>;

export type WordEntryWithDetails = Prisma.WordEntryGetPayload<{
  include: typeof WORD_ENTRY_DETAILS_INCLUDE;
}>;

export type WordTranslationRow = Prisma.WordTranslationGetPayload<Record<string, never>>;

/** Fila resumida del diccionario administrativo. */
export class WordListItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'beautiful' })
  word!: string;

  @ApiProperty({ example: 'beautiful' })
  normalizedWord!: string;

  @ApiProperty({ example: 'en' })
  language!: string;

  @ApiPropertyOptional({ nullable: true })
  phonetic!: string | null;

  @ApiPropertyOptional({ nullable: true })
  definitionEn!: string | null;

  @ApiPropertyOptional({ enum: PartOfSpeech, nullable: true })
  partOfSpeech!: PartOfSpeech | null;

  @ApiPropertyOptional({ nullable: true })
  source!: string | null;

  @ApiProperty({ enum: ReviewStatus })
  reviewStatus!: ReviewStatus;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  reviewedByUserId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  reviewedAt!: Date | null;

  @ApiProperty()
  translationsCount!: number;

  @ApiProperty()
  savedUsersCount!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

/** Traducción expuesta a Flutter y React Admin. */
export class WordTranslationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'es' })
  targetLanguage!: string;

  @ApiProperty({ example: 'hermoso' })
  translation!: string;

  @ApiPropertyOptional({ nullable: true })
  meaningContext!: string | null;

  @ApiPropertyOptional({ nullable: true })
  source!: string | null;

  @ApiProperty({ enum: ReviewStatus })
  reviewStatus!: ReviewStatus;
}

/** Traducción administrable con datos de revisión. */
export class WordTranslationAdminResponseDto extends WordTranslationResponseDto {
  @ApiProperty({ format: 'uuid' })
  wordEntryId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  reviewedByUserId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  reviewedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

/** Ejemplo de uso asociado a una palabra. */
export class WordExampleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  exampleText!: string;

  @ApiPropertyOptional({ nullable: true })
  source!: string | null;

  @ApiProperty()
  sortOrder!: number;
}

/** Audio o fonética por acento. */
export class WordPronunciationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ nullable: true, example: 'en-US' })
  accent!: string | null;

  @ApiPropertyOptional({ nullable: true, example: '/bjuːtɪfəl/' })
  phonetic!: string | null;

  @ApiPropertyOptional({ nullable: true })
  audioUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  source!: string | null;
}

/** Respuesta completa de consulta de palabra. */
export class WordLookupResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'beautiful' })
  word!: string;

  @ApiProperty({ example: 'beautiful' })
  normalizedWord!: string;

  @ApiProperty({ example: 'en' })
  language!: string;

  @ApiPropertyOptional({ nullable: true })
  phonetic!: string | null;

  @ApiPropertyOptional({ nullable: true })
  definitionEn!: string | null;

  @ApiPropertyOptional({ enum: PartOfSpeech, nullable: true })
  partOfSpeech!: PartOfSpeech | null;

  @ApiPropertyOptional({ nullable: true })
  source!: string | null;

  @ApiProperty({ enum: ReviewStatus })
  reviewStatus!: ReviewStatus;

  @ApiProperty({ type: [WordTranslationResponseDto] })
  translations!: WordTranslationResponseDto[];

  @ApiProperty({ type: [WordExampleResponseDto] })
  examples!: WordExampleResponseDto[];

  @ApiProperty({ type: [WordPronunciationResponseDto] })
  pronunciations!: WordPronunciationResponseDto[];

  @ApiProperty()
  isSaved!: boolean;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  savedWordId!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

/** Convierte el registro persistido en el contrato estable de respuesta. */
export function toWordLookupResponse(
  entry: WordEntryWithDetails,
  savedWordId: string | null = null,
): WordLookupResponseDto {
  const translations = [...entry.translations].sort((a, b) => {
    const aReviewed = a.reviewStatus === ReviewStatus.reviewed ? 0 : 1;
    const bReviewed = b.reviewStatus === ReviewStatus.reviewed ? 0 : 1;
    return aReviewed - bReviewed || a.createdAt.getTime() - b.createdAt.getTime();
  });

  return {
    id: entry.id,
    word: entry.word,
    normalizedWord: entry.normalizedWord,
    language: entry.language,
    phonetic: entry.phonetic,
    definitionEn: entry.definitionEn,
    partOfSpeech: entry.partOfSpeech,
    source: entry.source,
    reviewStatus: entry.reviewStatus,
    translations: translations.map((translation) => ({
      id: translation.id,
      targetLanguage: translation.targetLanguage,
      translation: translation.translation,
      meaningContext: translation.meaningContext,
      source: translation.source,
      reviewStatus: translation.reviewStatus,
    })),
    examples: entry.examples.map((example) => ({
      id: example.id,
      exampleText: example.exampleText,
      source: example.source,
      sortOrder: example.sortOrder,
    })),
    pronunciations: entry.pronunciations.map((pronunciation) => ({
      id: pronunciation.id,
      accent: pronunciation.accent,
      phonetic: pronunciation.phonetic,
      audioUrl: pronunciation.audioUrl,
      source: pronunciation.source,
    })),
    isSaved: savedWordId !== null,
    savedWordId,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

/** Convierte una fila resumida en contrato administrativo. */
export function toWordListItem(row: WordEntryListRow): WordListItemResponseDto {
  return {
    id: row.id,
    word: row.word,
    normalizedWord: row.normalizedWord,
    language: row.language,
    phonetic: row.phonetic,
    definitionEn: row.definitionEn,
    partOfSpeech: row.partOfSpeech,
    source: row.source,
    reviewStatus: row.reviewStatus,
    reviewedByUserId: row.reviewedByUserId,
    reviewedAt: row.reviewedAt,
    translationsCount: row._count.translations,
    savedUsersCount: row._count.savedByUsers,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Convierte una traducción persistida en contrato administrativo. */
export function toWordTranslationAdminResponse(
  row: WordTranslationRow,
): WordTranslationAdminResponseDto {
  return {
    id: row.id,
    wordEntryId: row.wordEntryId,
    targetLanguage: row.targetLanguage,
    translation: row.translation,
    meaningContext: row.meaningContext,
    source: row.source,
    reviewStatus: row.reviewStatus,
    reviewedByUserId: row.reviewedByUserId,
    reviewedAt: row.reviewedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
