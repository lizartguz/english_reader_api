import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { trimText } from '@/common/utils/transform.util';

/**
 * Datos para crear una historia.
 *
 * La historia siempre nace en estado `draft`: la publicación es una acción
 * explícita posterior mediante el endpoint de cambio de estado.
 */
export class CreateStoryDto {
  @ApiProperty({ example: 'The Red Umbrella' })
  @IsString({ message: 'El título es obligatorio.' })
  @MaxLength(200, { message: 'El título no puede superar los 200 caracteres.' })
  @Transform(trimText)
  title!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'El nivel de lectura no es válido.' })
  readingLevelId!: string;

  @ApiPropertyOptional({ example: 'Jane Doe', description: 'Autor de la historia. Opcional.' })
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'El autor no puede superar los 150 caracteres.' })
  @Transform(trimText)
  author?: string;

  @ApiPropertyOptional({ example: 'Una historia corta sobre un paraguas rojo.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'El resumen no puede superar los 2000 caracteres.' })
  @Transform(trimText)
  summary?: string;

  @ApiProperty({ description: 'Contenido en inglés de la historia.' })
  @IsString({ message: 'El contenido es obligatorio.' })
  @MaxLength(200000, { message: 'El contenido es demasiado extenso.' })
  content!: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Los minutos estimados deben ser un número entero.' })
  @Min(1, { message: 'Los minutos estimados deben ser al menos 1.' })
  estimatedReadingMinutes?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El orden debe ser un número entero.' })
  @Min(0, { message: 'El orden no puede ser negativo.' })
  sortOrder?: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'Identificadores de los géneros asociados.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: 'No se pueden asignar más de 10 géneros.' })
  @ArrayUnique()
  @IsUUID('all', { each: true, message: 'Uno de los géneros enviados no es válido.' })
  genreIds?: string[];
}
