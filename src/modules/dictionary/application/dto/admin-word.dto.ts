import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PartOfSpeech, ReviewStatus } from '@/common/enums/domain.enums';
import { trimText } from '@/common/utils/transform.util';

/** Ejemplo recibido al crear una palabra manualmente. */
export class WordExampleInputDto {
  @ApiProperty()
  @IsString({ message: 'El ejemplo es obligatorio.' })
  @MaxLength(2000, { message: 'El ejemplo no puede superar los 2000 caracteres.' })
  @Transform(trimText)
  exampleText!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La fuente no puede superar los 100 caracteres.' })
  @Transform(trimText)
  source?: string | null;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El orden debe ser un número entero.' })
  @Min(0, { message: 'El orden no puede ser negativo.' })
  sortOrder?: number;
}

/** Pronunciación recibida al crear una palabra manualmente. */
export class WordPronunciationInputDto {
  @ApiPropertyOptional({ nullable: true, example: 'en-US' })
  @IsOptional()
  @IsString()
  @MaxLength(10, { message: 'El acento no puede superar los 10 caracteres.' })
  @Transform(trimText)
  accent?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'La fonética no puede superar los 150 caracteres.' })
  @Transform(trimText)
  phonetic?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'La URL de audio no puede superar los 1000 caracteres.' })
  @Transform(trimText)
  audioUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La fuente no puede superar los 100 caracteres.' })
  @Transform(trimText)
  source?: string | null;
}

/** Traducción recibida al crear una palabra manualmente. */
export class WordTranslationInputDto {
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

/** Datos para crear una palabra desde el panel administrativo. */
export class CreateWordDto {
  @ApiProperty({ example: 'beautiful' })
  @IsString({ message: 'La palabra es obligatoria.' })
  @MaxLength(150, { message: 'La palabra no puede superar los 150 caracteres.' })
  @Transform(trimText)
  word!: string;

  @ApiPropertyOptional({ example: 'en', default: 'en' })
  @IsOptional()
  @IsString()
  @IsIn(['en'], { message: 'Por ahora solo se admite diccionario en inglés.' })
  language: string = 'en';

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'La fonética no puede superar los 150 caracteres.' })
  @Transform(trimText)
  phonetic?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10000, { message: 'La definición no puede superar los 10000 caracteres.' })
  @Transform(trimText)
  definitionEn?: string | null;

  @ApiPropertyOptional({ enum: PartOfSpeech, nullable: true })
  @IsOptional()
  @IsEnum(PartOfSpeech, { message: 'El tipo gramatical no es válido.' })
  partOfSpeech?: PartOfSpeech | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La fuente no puede superar los 100 caracteres.' })
  @Transform(trimText)
  source?: string | null;

  @ApiPropertyOptional({ type: [WordExampleInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: 'No se pueden enviar más de 10 ejemplos.' })
  @ValidateNested({ each: true })
  @Type(() => WordExampleInputDto)
  examples?: WordExampleInputDto[];

  @ApiPropertyOptional({ type: [WordPronunciationInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: 'No se pueden enviar más de 10 pronunciaciones.' })
  @ValidateNested({ each: true })
  @Type(() => WordPronunciationInputDto)
  pronunciations?: WordPronunciationInputDto[];

  @ApiPropertyOptional({ type: [WordTranslationInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: 'No se pueden enviar más de 10 traducciones.' })
  @ValidateNested({ each: true })
  @Type(() => WordTranslationInputDto)
  translations?: WordTranslationInputDto[];
}

/** Datos editables de una palabra del diccionario. */
export class UpdateWordDto {
  @ApiPropertyOptional({ example: 'beautiful' })
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'La palabra no puede superar los 150 caracteres.' })
  @Transform(trimText)
  word?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  @IsIn(['en'], { message: 'Por ahora solo se admite diccionario en inglés.' })
  language?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'La fonética no puede superar los 150 caracteres.' })
  @Transform(trimText)
  phonetic?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10000, { message: 'La definición no puede superar los 10000 caracteres.' })
  @Transform(trimText)
  definitionEn?: string | null;

  @ApiPropertyOptional({ enum: PartOfSpeech, nullable: true })
  @IsOptional()
  @IsEnum(PartOfSpeech, { message: 'El tipo gramatical no es válido.' })
  partOfSpeech?: PartOfSpeech | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'La fuente no puede superar los 100 caracteres.' })
  @Transform(trimText)
  source?: string | null;
}

/** Cambio de estado de revisión de una palabra. */
export class ReviewWordDto {
  @ApiProperty({ enum: ReviewStatus })
  @IsEnum(ReviewStatus, { message: 'El estado de revisión no es válido.' })
  reviewStatus!: ReviewStatus;
}
