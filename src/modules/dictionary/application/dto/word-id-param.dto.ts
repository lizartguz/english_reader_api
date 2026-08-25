import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Parámetro `wordId` usado en rutas anidadas de traducciones. */
export class WordIdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'La palabra seleccionada no es válida.' })
  wordId!: string;
}
