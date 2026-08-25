import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { StoryStatus } from '@/common/enums/domain.enums';

/** Cambia el estado de publicación de una historia. */
export class ChangeStoryStatusDto {
  @ApiProperty({ enum: StoryStatus, example: StoryStatus.published })
  @IsEnum(StoryStatus, { message: 'El estado enviado no es válido.' })
  status!: StoryStatus;
}
