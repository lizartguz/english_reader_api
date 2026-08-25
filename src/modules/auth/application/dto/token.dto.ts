import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ClientType } from '@/common/enums/client-type.enum';
import {
  IsSecurePassword,
  PASSWORD_POLICY,
} from '@/common/decorators/is-secure-password.decorator';
import { normalizeEmail } from '@/common/utils/transform.util';
import { DeviceInfoDto } from './device-info.dto';

/** Renovación de sesión. En clientes web el token viaja en cookie, no en el cuerpo. */
export class RefreshSessionDto {
  @ApiPropertyOptional({
    description: 'Refresh token. Obligatorio para clientes móviles; en web se lee de la cookie.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  refreshToken?: string;

  @ApiPropertyOptional({ enum: ClientType, default: ClientType.Mobile })
  @IsOptional()
  @IsEnum(ClientType, { message: 'El tipo de cliente no es válido.' })
  clientType: ClientType = ClientType.Mobile;

  @ApiPropertyOptional({ type: DeviceInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  device?: DeviceInfoDto;
}

/** Cierre de sesión. Acepta el token por cuerpo o por cookie. */
export class LogoutDto {
  @ApiPropertyOptional({ description: 'Refresh token a invalidar.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  refreshToken?: string;

  @ApiPropertyOptional({ enum: ClientType, default: ClientType.Mobile })
  @IsOptional()
  @IsEnum(ClientType, { message: 'El tipo de cliente no es válido.' })
  clientType: ClientType = ClientType.Mobile;
}

/** Solicitud de recuperación de contraseña. */
export class ForgotPasswordDto {
  @ApiProperty({ example: 'usuario@correo.com' })
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @MaxLength(255)
  @Transform(normalizeEmail)
  email!: string;
}

/** Definición de una nueva contraseña a partir de un token de recuperación. */
export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recibido por correo.' })
  @IsString({ message: 'El token de recuperación es obligatorio.' })
  @MaxLength(200)
  token!: string;

  @ApiProperty({ description: PASSWORD_POLICY.Description })
  @IsSecurePassword()
  password!: string;
}

/** Cambio de contraseña de la propia cuenta. */
export class ChangePasswordDto {
  @ApiProperty({ description: 'Contraseña actual.' })
  @IsString({ message: 'La contraseña actual es obligatoria.' })
  @MaxLength(72)
  currentPassword!: string;

  @ApiProperty({ description: PASSWORD_POLICY.Description })
  @IsSecurePassword()
  newPassword!: string;
}

/** Confirmación de correo mediante el token enviado al registrarse. */
export class VerifyEmailDto {
  @ApiProperty({ description: 'Token recibido por correo.' })
  @IsString({ message: 'El token de verificación es obligatorio.' })
  @MaxLength(200)
  token!: string;
}

/** Reenvío del correo de verificación. */
export class ResendVerificationDto {
  @ApiProperty({ example: 'lector@correo.com' })
  @IsEmail({}, { message: 'El correo electrónico no es válido.' })
  @MaxLength(255)
  @Transform(normalizeEmail)
  email!: string;
}
