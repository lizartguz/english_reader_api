import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Representación pública de un género literario. */
export class GenreResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ADVENTURE' })
  code!: string;

  @ApiProperty({ example: 'Aventura' })
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
