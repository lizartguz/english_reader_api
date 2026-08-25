import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { FileAccessScope, StoryAssetType } from '@/common/enums/domain.enums';

/** Parámetros de ruta para recursos anidados en historias. */
export class StoryAssetStoryParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'La historia seleccionada no es válida.' })
  storyId!: string;
}

/** Datos enviados junto con el archivo multipart. */
export class UploadStoryAssetDto {
  @ApiProperty({ enum: StoryAssetType })
  @IsEnum(StoryAssetType, { message: 'El tipo de recurso no es válido.' })
  type!: StoryAssetType;

  @ApiPropertyOptional({ enum: FileAccessScope, default: FileAccessScope.private })
  @IsOptional()
  @IsEnum(FileAccessScope, { message: 'El alcance de acceso no es válido.' })
  accessScope?: FileAccessScope;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El orden debe ser un número entero.' })
  @Min(0, { message: 'El orden no puede ser negativo.' })
  sortOrder?: number;
}
