import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Parámetro de ruta para recursos identificados por UUID. */
export class IdParamDto {
  @ApiProperty({ description: 'Identificador único del recurso.', format: 'uuid' })
  @IsUUID('all', { message: 'El identificador enviado no es válido.' })
  id!: string;
}
