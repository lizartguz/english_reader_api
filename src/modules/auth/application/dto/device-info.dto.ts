import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Información del dispositivo que inicia sesión.
 *
 * La aplicación Flutter debe enviarla para que la API pueda aplicar la política
 * de un solo dispositivo activo por usuario cliente y para dar trazabilidad a
 * las sesiones móviles.
 */
export class DeviceInfoDto {
  @ApiPropertyOptional({ description: 'Identificador estable del dispositivo.' })
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'El identificador del dispositivo es demasiado largo.' })
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Plataforma del cliente.', example: 'android' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  platform?: string;

  @ApiPropertyOptional({ description: 'Versión de la aplicación.', example: '1.0.0' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  appVersion?: string;

  @ApiPropertyOptional({ description: 'Nombre visible del dispositivo.' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  deviceName?: string;
}
