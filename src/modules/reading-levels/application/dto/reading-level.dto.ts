import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { normalizeUpperCode, trimText } from '@/common/utils/transform.util';

/** Datos para crear un nivel de lectura. */
export class CreateReadingLevelDto {
  @ApiProperty({ example: 'A1', description: 'Código corto y único del nivel.' })
  @IsString({ message: 'El código es obligatorio.' })
  @MaxLength(20, { message: 'El código no puede superar los 20 caracteres.' })
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'El código solo puede contener letras mayúsculas, números, guiones y guion bajo.',
  })
  @Transform(normalizeUpperCode)
  code!: string;

  @ApiProperty({ example: 'Principiante (A1)' })
  @IsString({ message: 'El nombre es obligatorio.' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres.' })
  @Transform(trimText)
  name!: string;

  @ApiPropertyOptional({ example: 'Frases simples y vocabulario básico.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'La descripción no puede superar los 2000 caracteres.' })
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

/** Datos para actualizar un nivel de lectura. Todos los campos son opcionales. */
export class UpdateReadingLevelDto {
  @ApiPropertyOptional({ example: 'A1' })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'El código no puede superar los 20 caracteres.' })
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'El código solo puede contener letras mayúsculas, números, guiones y guion bajo.',
  })
  @Transform(normalizeUpperCode)
  code?: string;

  @ApiPropertyOptional({ example: 'Principiante (A1)' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres.' })
  @Transform(trimText)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'La descripción no puede superar los 2000 caracteres.' })
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
