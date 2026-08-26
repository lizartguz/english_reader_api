import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileAccessScope, StoryAssetType, StoryStatus } from '@/common/enums/domain.enums';

/** Referencia mínima a un nivel de lectura, incluida dentro de una historia. */
export class StoryReadingLevelRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'A1' })
  code!: string;

  @ApiProperty({ example: 'Principiante (A1)' })
  name!: string;
}

/** Referencia mínima a un género, incluida dentro de una historia. */
export class StoryGenreRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ADVENTURE' })
  code!: string;

  @ApiProperty({ example: 'Aventura' })
  name!: string;
}

/** Historia en un listado. No incluye el contenido completo por peso. */
export class StoryListItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  author!: string | null;

  @ApiPropertyOptional({ nullable: true })
  summary!: string | null;

  @ApiProperty({ enum: StoryStatus })
  status!: StoryStatus;

  @ApiPropertyOptional({ nullable: true })
  estimatedReadingMinutes!: number | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiPropertyOptional({ nullable: true })
  publishedAt!: Date | null;

  @ApiProperty({ type: StoryReadingLevelRefDto })
  readingLevel!: StoryReadingLevelRefDto;

  @ApiProperty({ type: [StoryGenreRefDto] })
  genres!: StoryGenreRefDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

/** Recurso asociado a una historia. Compartido por el panel y por Flutter. */
export class StoryAssetSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: StoryAssetType })
  type!: StoryAssetType;

  @ApiPropertyOptional({ nullable: true })
  originalFileName!: string | null;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  fileSizeBytes!: number;

  @ApiProperty({ enum: FileAccessScope })
  accessScope!: FileAccessScope;

  @ApiPropertyOptional({ nullable: true })
  metadata!: unknown;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  downloadUrl!: string;
}

/**
 * Historia completa para el panel: contenido de lectura y recursos asociados,
 * para que el administrador vea qué archivos ya tiene cargados.
 */
export class StoryDetailResponseDto extends StoryListItemResponseDto {
  @ApiProperty({ description: 'Contenido en inglés de la historia.' })
  content!: string;

  @ApiProperty({ type: [StoryAssetSummaryDto] })
  assets!: StoryAssetSummaryDto[];
}

/** Historia publicada en listado móvil, sin contenido completo. */
export class AppStoryListItemResponseDto extends StoryListItemResponseDto {
  @ApiProperty({ type: [StoryAssetSummaryDto] })
  assets!: StoryAssetSummaryDto[];
}

/** Historia publicada completa para lectura móvil. */
export class AppStoryDetailResponseDto extends AppStoryListItemResponseDto {
  @ApiProperty({ description: 'Contenido en inglés de la historia.' })
  content!: string;
}
