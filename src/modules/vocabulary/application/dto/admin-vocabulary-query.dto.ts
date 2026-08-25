import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { SavedWordStatus } from '@/common/enums/domain.enums';

/** Filtros administrativos para vocabulario guardado por usuarios. */
export class AdminVocabularyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'El usuario del filtro no es válido.' })
  userId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'La historia del filtro no es válida.' })
  storyId?: string;

  @ApiPropertyOptional({ enum: SavedWordStatus })
  @IsOptional()
  @IsEnum(SavedWordStatus, { message: 'El estado de aprendizaje no es válido.' })
  status?: SavedWordStatus;
}
