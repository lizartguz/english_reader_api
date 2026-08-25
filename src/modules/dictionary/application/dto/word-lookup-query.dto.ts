import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { trimText } from '@/common/utils/transform.util';

/** Parámetros enviados por Flutter al tocar una palabra. */
export class WordLookupQueryDto {
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

  @ApiPropertyOptional({ example: 'es', default: 'es' })
  @IsOptional()
  @IsString()
  @IsIn(['es'], { message: 'Por ahora solo se admite traducción al español.' })
  targetLanguage: string = 'es';
}
