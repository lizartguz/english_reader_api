import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { toBoolean } from '@/common/utils/transform.util';

/** Filtros administrativos para avances de lectura de clientes. */
export class AdminReadingProgressQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'El usuario del filtro no es válido.' })
  userId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'La historia del filtro no es válida.' })
  storyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: 'El filtro de completado debe ser verdadero o falso.' })
  completed?: boolean;
}
