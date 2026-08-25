import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Representación pública de un nivel de lectura. */
export class ReadingLevelResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'A1' })
  code!: string;

  @ApiProperty({ example: 'Principiante (A1)' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
