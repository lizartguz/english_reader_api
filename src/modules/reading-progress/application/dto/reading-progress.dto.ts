import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { toBoolean, trimText } from '@/common/utils/transform.util';

/** Datos que Flutter envía al sincronizar avance de lectura. */
export class UpdateReadingProgressDto {
  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El porcentaje de avance debe ser numérico.' })
  @Min(0, { message: 'El porcentaje mínimo es 0.' })
  @Max(100, { message: 'El porcentaje máximo es 100.' })
  progressPercent?: number;

  @ApiPropertyOptional({ nullable: true, example: 'paragraph:4' })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'La posición de lectura no puede superar los 255 caracteres.' })
  @Transform(trimText)
  lastPosition?: string | null;

  @ApiPropertyOptional({ description: 'Marca la historia como completada o la reabre.' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: 'El estado completado debe ser verdadero o falso.' })
  completed?: boolean;
}

/** Parámetro `storyId` usado en rutas de progreso. */
export class ReadingProgressStoryParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'La historia seleccionada no es válida.' })
  storyId!: string;
}
