import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionCode } from '@/common/enums/permission.enum';

/** Representación pública de un rol, con sus permisos efectivos. */
export class RoleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ADMIN' })
  code!: string;

  @ApiProperty({ example: 'Administrador' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ description: 'Los roles base del sistema no pueden renombrarse ni eliminarse.' })
  isSystem!: boolean;

  @ApiProperty({ type: [String], enum: PermissionCode })
  permissions!: string[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

/** Permiso del catálogo, usado para poblar el editor de roles en el panel. */
export class PermissionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'stories.update' })
  code!: string;

  @ApiProperty({ example: 'stories' })
  module!: string;

  @ApiProperty({ example: 'update' })
  action!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;
}
