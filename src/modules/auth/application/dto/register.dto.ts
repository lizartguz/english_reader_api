import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  IsSecurePassword,
  PASSWORD_POLICY,
} from '@/common/decorators/is-secure-password.decorator';
import { normalizeEmail, trimText } from '@/common/utils/transform.util';

/**
 * Alta de un usuario cliente desde la aplicación.
 *
 * El registro siempre crea la cuenta en estado `pending_verification`; el rol
 * `CLIENT` se asigna en el servidor y nunca puede enviarse desde el cliente.
 */
export class RegisterDto {
  @ApiProperty({ example: 'lector@correo.com' })
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @MaxLength(255)
  @Transform(normalizeEmail)
  email!: string;

  @ApiProperty({ description: PASSWORD_POLICY.Description })
  @IsSecurePassword()
  password!: string;

  @ApiProperty({ example: 'Ana' })
  @IsString({ message: 'El nombre es obligatorio.' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres.' })
  @Transform(trimText)
  firstName!: string;

  @ApiProperty({ example: 'García' })
  @IsString({ message: 'El apellido es obligatorio.' })
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres.' })
  @MaxLength(100, { message: 'El apellido no puede superar los 100 caracteres.' })
  @Transform(trimText)
  lastName!: string;

  @ApiPropertyOptional({ example: '+573001234567' })
  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'El teléfono no puede superar los 30 caracteres.' })
  @Matches(/^[+]?[0-9\s-]{6,30}$/, { message: 'El teléfono no tiene un formato válido.' })
  @Transform(trimText)
  phoneNumber?: string;
}
