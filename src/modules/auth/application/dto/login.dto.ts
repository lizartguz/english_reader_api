import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ClientType } from '@/common/enums/client-type.enum';
import { normalizeEmail } from '@/common/utils/transform.util';
import { DeviceInfoDto } from './device-info.dto';

/** Credenciales y contexto necesarios para iniciar sesión. */
export class LoginDto {
  @ApiProperty({ example: 'admin@englishreader.local' })
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @MaxLength(255)
  @Transform(normalizeEmail)
  email!: string;

  @ApiProperty({ description: 'Contraseña del usuario.' })
  @IsString({ message: 'La contraseña es obligatoria.' })
  @MaxLength(72)
  password!: string;

  @ApiPropertyOptional({
    enum: ClientType,
    default: ClientType.Mobile,
    description:
      'Origen de la solicitud. `web` entrega el refresh token en cookie HttpOnly; `mobile` lo devuelve en el cuerpo.',
  })
  @IsOptional()
  @IsEnum(ClientType, { message: 'El tipo de cliente no es válido.' })
  clientType: ClientType = ClientType.Mobile;

  @ApiPropertyOptional({ type: DeviceInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  device?: DeviceInfoDto;
}
