import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { normalizeEmail, trimText } from '@/common/utils/transform.util';

/**
 * Datos para actualizar el perfil de un usuario. No incluye contraseña,
 * roles ni estado: esos cambios tienen endpoints dedicados con sus propias
 * reglas de autorización.
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'ana@englishreader.local' })
  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @MaxLength(255)
  @Transform(normalizeEmail)
  email?: string;

  @ApiPropertyOptional({ example: 'Ana' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(100)
  @Transform(trimText)
  firstName?: string;

  @ApiPropertyOptional({ example: 'García' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres.' })
  @MaxLength(100)
  @Transform(trimText)
  lastName?: string;

  @ApiPropertyOptional({ example: '+573001234567' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[+]?[0-9\s-]{6,30}$/, { message: 'El teléfono no tiene un formato válido.' })
  @Transform(trimText)
  phoneNumber?: string;
}
