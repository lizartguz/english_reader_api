import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReviewStatus } from '@/common/enums/domain.enums';
import { trimText } from '@/common/utils/transform.util';

/** Datos para crear una traducción administrativa. */
export class CreateTranslationDto {
  @ApiPropertyOptional({ example: 'es', default: 'es' })
  @IsOptional()
  @IsString()
  @IsIn(['es'], { message: 'Por ahora solo se admite traducción al español.' })
  targetLanguage: string = 'es';

  @ApiProperty({ example: 'hermoso' })
  @IsString({ message: 'La traducción es obligatoria.' })
  @MaxLength(255, { message: 'La traducción no puede superar los 255 caracteres.' })
  @Transform(trimText)
  translation!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'El contexto no puede superar los 2000 caracteres.' })
  @Transform(trimText)
  meaningContext?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La fuente no puede superar los 100 caracteres.' })
  @Transform(trimText)
  source?: string | null;
}

/** Datos editables de una traducción. */
export class UpdateTranslationDto {
  @ApiPropertyOptional({ example: 'es' })
  @IsOptional()
  @IsString()
  @IsIn(['es'], { message: 'Por ahora solo se admite traducción al español.' })
  targetLanguage?: string;

  @ApiPropertyOptional({ example: 'hermoso' })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'La traducción no puede superar los 255 caracteres.' })
  @Transform(trimText)
  translation?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'El contexto no puede superar los 2000 caracteres.' })
  @Transform(trimText)
  meaningContext?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La fuente no puede superar los 100 caracteres.' })
  @Transform(trimText)
  source?: string | null;
}

/** Cambio de estado de revisión de una traducción. */
export class ReviewTranslationDto {
  @ApiProperty({ enum: ReviewStatus })
  @IsEnum(ReviewStatus, { message: 'El estado de revisión no es válido.' })
  reviewStatus!: ReviewStatus;
}
