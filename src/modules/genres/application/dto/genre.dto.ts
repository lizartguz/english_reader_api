import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { normalizeUpperCode, trimText } from '@/common/utils/transform.util';

/** Datos para crear un género literario. */
export class CreateGenreDto {
  @ApiProperty({ example: 'ADVENTURE', description: 'Código corto y único del género.' })
  @IsString({ message: 'El código es obligatorio.' })
  @MaxLength(50, { message: 'El código no puede superar los 50 caracteres.' })
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'El código solo puede contener letras mayúsculas, números, guiones y guion bajo.',
  })
  @Transform(normalizeUpperCode)
  code!: string;

  @ApiProperty({ example: 'Aventura' })
  @IsString({ message: 'El nombre es obligatorio.' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres.' })
  @Transform(trimText)
  name!: string;

  @ApiPropertyOptional({ example: 'Historias de exploración y desafíos.' })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'La descripción no puede superar los 255 caracteres.' })
  @Transform(trimText)
  description?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El orden debe ser un número entero.' })
  @Min(0, { message: 'El orden no puede ser negativo.' })
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso.' })
  isActive?: boolean;
}

/** Datos para actualizar un género literario. Todos los campos son opcionales. */
export class UpdateGenreDto {
  @ApiPropertyOptional({ example: 'ADVENTURE' })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El código no puede superar los 50 caracteres.' })
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'El código solo puede contener letras mayúsculas, números, guiones y guion bajo.',
  })
  @Transform(normalizeUpperCode)
  code?: string;

  @ApiPropertyOptional({ example: 'Aventura' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres.' })
  @Transform(trimText)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'La descripción no puede superar los 255 caracteres.' })
  @Transform(trimText)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El orden debe ser un número entero.' })
  @Min(0, { message: 'El orden no puede ser negativo.' })
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso.' })
  isActive?: boolean;
}
