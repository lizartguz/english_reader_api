import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  IsSecurePassword,
  PASSWORD_POLICY,
} from '@/common/decorators/is-secure-password.decorator';
import { normalizeEmail, trimText } from '@/common/utils/transform.util';
import { RoleCode } from '@/common/enums/role-code.enum';

/**
 * Datos para crear un usuario desde el panel administrativo.
 *
 * A diferencia del auto-registro de clientes, el usuario queda activo y con
 * el correo verificado de inmediato: el administrador ya validó los datos.
 */
export class CreateUserDto {
  @ApiProperty({ example: 'nuevo.admin@englishreader.local' })
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
  @MaxLength(100)
  @Transform(trimText)
  firstName!: string;

  @ApiProperty({ example: 'García' })
  @IsString({ message: 'El apellido es obligatorio.' })
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres.' })
  @MaxLength(100)
  @Transform(trimText)
  lastName!: string;

  @ApiPropertyOptional({ example: '+573001234567' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[+]?[0-9\s-]{6,30}$/, { message: 'El teléfono no tiene un formato válido.' })
  @Transform(trimText)
  phoneNumber?: string;

  @ApiProperty({
    type: [String],
    enum: RoleCode,
    description:
      'Al menos un rol. Asignar ADMIN o SUPER_ADMIN requiere el permiso correspondiente.',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debes asignar al menos un rol al usuario.' })
  @ArrayUnique()
  @IsEnum(RoleCode, { each: true, message: 'Uno de los roles enviados no es válido.' })
  roleCodes!: RoleCode[];
}
