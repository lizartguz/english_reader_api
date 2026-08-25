import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Prisma } from '@/generated/prisma/client';

export type ReadingProgressRow = Prisma.ReadingProgressGetPayload<Record<string, never>>;

export const ADMIN_READING_PROGRESS_INCLUDE = {
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
  story: { select: { id: true, title: true, slug: true } },
} satisfies Prisma.ReadingProgressInclude;

export type AdminReadingProgressRow = Prisma.ReadingProgressGetPayload<{
  include: typeof ADMIN_READING_PROGRESS_INCLUDE;
}>;

/** Progreso de lectura del usuario cliente para una historia. */
export class ReadingProgressResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  storyId!: string;

  @ApiProperty({ minimum: 0, maximum: 100 })
  progressPercent!: number;

  @ApiPropertyOptional({ nullable: true })
  lastPosition!: string | null;

  @ApiPropertyOptional({ nullable: true })
  completedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  lastReadAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

/** Usuario dueño del progreso visible para React Admin. */
export class ReadingProgressUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;
}

/** Historia asociada al progreso visible para React Admin. */
export class ReadingProgressStoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;
}

/** Progreso de lectura con usuario e historia para consulta administrativa. */
export class AdminReadingProgressResponseDto extends ReadingProgressResponseDto {
  @ApiProperty({ type: ReadingProgressUserResponseDto })
  user!: ReadingProgressUserResponseDto;

  @ApiProperty({ type: ReadingProgressStoryResponseDto })
  story!: ReadingProgressStoryResponseDto;
}

/** Convierte el Decimal de Prisma a un número estable para Flutter. */
export function toReadingProgressResponse(row: ReadingProgressRow): ReadingProgressResponseDto {
  return {
    id: row.id,
    userId: row.userId,
    storyId: row.storyId,
    progressPercent: Number(row.progressPercent),
    lastPosition: row.lastPosition,
    completedAt: row.completedAt,
    lastReadAt: row.lastReadAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Convierte un avance de lectura en respuesta administrativa. */
export function toAdminReadingProgressResponse(
  row: AdminReadingProgressRow,
): AdminReadingProgressResponseDto {
  return {
    ...toReadingProgressResponse(row),
    user: {
      id: row.user.id,
      email: row.user.email,
      firstName: row.user.firstName,
      lastName: row.user.lastName,
    },
    story: {
      id: row.story.id,
      title: row.story.title,
      slug: row.story.slug,
    },
  };
}
