import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Prisma } from '@/generated/prisma/client';
import { SavedWordStatus } from '@/common/enums/domain.enums';
import {
  WORD_ENTRY_DETAILS_INCLUDE,
  WordLookupResponseDto,
  toWordLookupResponse,
} from '@/modules/dictionary/domain/word-entry.mapper';

export const SAVED_WORD_INCLUDE = {
  wordEntry: { include: WORD_ENTRY_DETAILS_INCLUDE },
  story: { select: { id: true, title: true, slug: true } },
} satisfies Prisma.UserSavedWordInclude;

export const ADMIN_SAVED_WORD_INCLUDE = {
  ...SAVED_WORD_INCLUDE,
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
} satisfies Prisma.UserSavedWordInclude;

export type SavedWordWithDetails = Prisma.UserSavedWordGetPayload<{
  include: typeof SAVED_WORD_INCLUDE;
}>;

export type AdminSavedWordWithDetails = Prisma.UserSavedWordGetPayload<{
  include: typeof ADMIN_SAVED_WORD_INCLUDE;
}>;

/** Historia desde la que se guardó una palabra. */
export class VocabularyStoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;
}

/** Registro de vocabulario personal del usuario cliente. */
export class VocabularyResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: SavedWordStatus })
  status!: SavedWordStatus;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  savedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  lastReviewedAt!: Date | null;

  @ApiProperty({ type: WordLookupResponseDto })
  word!: WordLookupResponseDto;

  @ApiPropertyOptional({ type: VocabularyStoryResponseDto, nullable: true })
  story!: VocabularyStoryResponseDto | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

/** Usuario dueño del vocabulario visible para React Admin. */
export class VocabularyUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;
}

/** Registro de vocabulario con dueño, usado por consulta administrativa. */
export class AdminVocabularyResponseDto extends VocabularyResponseDto {
  @ApiProperty({ type: VocabularyUserResponseDto })
  user!: VocabularyUserResponseDto;
}

/** Convierte un vocabulario persistido en respuesta estable para Flutter. */
export function toVocabularyResponse(savedWord: SavedWordWithDetails): VocabularyResponseDto {
  return {
    id: savedWord.id,
    status: savedWord.status,
    notes: savedWord.notes,
    savedAt: savedWord.savedAt,
    lastReviewedAt: savedWord.lastReviewedAt,
    word: toWordLookupResponse(savedWord.wordEntry, savedWord.id),
    story: savedWord.story
      ? {
          id: savedWord.story.id,
          title: savedWord.story.title,
          slug: savedWord.story.slug,
        }
      : null,
    createdAt: savedWord.createdAt,
    updatedAt: savedWord.updatedAt,
  };
}

/** Convierte un vocabulario en respuesta administrativa con el usuario dueño. */
export function toAdminVocabularyResponse(
  savedWord: AdminSavedWordWithDetails,
): AdminVocabularyResponseDto {
  return {
    ...toVocabularyResponse(savedWord),
    user: {
      id: savedWord.user.id,
      email: savedWord.user.email,
      firstName: savedWord.user.firstName,
      lastName: savedWord.user.lastName,
    },
  };
}
