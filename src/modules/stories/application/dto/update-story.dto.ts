import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { trimText } from '@/common/utils/transform.util';

/**
 * Datos para actualizar una historia existente. Todos los campos son opcionales.
 *
 * El estado de publicación no se modifica aquí: tiene un endpoint dedicado que
 * valida las transiciones permitidas.
 */
export class UpdateStoryDto {
  @ApiPropertyOptional({ example: 'The Red Umbrella' })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'El título no puede superar los 200 caracteres.' })
  @Transform(trimText)
  title?: string;

  @ApiPropertyOptional({
    description: 'Identificador de URL. Si se omite, se conserva el actual.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(220)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El identificador de URL solo puede contener minúsculas, números y guiones.',
  })
  slug?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'El nivel de lectura no es válido.' })
  readingLevelId?: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'El autor no puede superar los 150 caracteres.' })
  @Transform(trimText)
  author?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'El resumen no puede superar los 2000 caracteres.' })
  @Transform(trimText)
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200000, { message: 'El contenido es demasiado extenso.' })
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Los minutos estimados deben ser un número entero.' })
  @Min(1, { message: 'Los minutos estimados deben ser al menos 1.' })
  estimatedReadingMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El orden debe ser un número entero.' })
  @Min(0, { message: 'El orden no puede ser negativo.' })
  sortOrder?: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'Reemplaza por completo la lista de géneros asociados.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: 'No se pueden asignar más de 10 géneros.' })
  @ArrayUnique()
  @IsUUID('all', { each: true, message: 'Uno de los géneros enviados no es válido.' })
  genreIds?: string[];
}
