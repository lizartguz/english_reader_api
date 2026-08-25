import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { SavedWordStatus } from '@/common/enums/domain.enums';
import { trimText } from '@/common/utils/transform.util';

/** Datos necesarios para guardar una palabra en el vocabulario personal. */
export class SaveVocabularyDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'La palabra seleccionada no es válida.' })
  wordEntryId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('all', { message: 'La historia seleccionada no es válida.' })
  storyId?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'La nota no puede superar los 1000 caracteres.' })
  @Transform(trimText)
  notes?: string;
}

/** Datos editables del vocabulario personal. */
export class UpdateVocabularyDto {
  @ApiPropertyOptional({ enum: SavedWordStatus })
  @IsOptional()
  @IsEnum(SavedWordStatus, { message: 'El estado de aprendizaje no es válido.' })
  status?: SavedWordStatus;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'La nota no puede superar los 1000 caracteres.' })
  @Transform(trimText)
  notes?: string;
}
