import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { normalizeUpperCode, trimText } from '@/common/utils/transform.util';
import { PermissionCode } from '@/common/enums/permission.enum';

/** Datos para crear un rol personalizado. */
export class CreateRoleDto {
  @ApiProperty({ example: 'CONTENT_EDITOR' })
  @IsString({ message: 'El código es obligatorio.' })
  @MaxLength(50, { message: 'El código no puede superar los 50 caracteres.' })
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'El código solo puede contener letras mayúsculas, números, guiones y guion bajo.',
  })
  @Transform(normalizeUpperCode)
  code!: string;

  @ApiProperty({ example: 'Editor de contenido' })
  @IsString({ message: 'El nombre es obligatorio.' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres.' })
  @Transform(trimText)
  name!: string;

  @ApiPropertyOptional({ example: 'Gestiona historias y niveles sin acceso a usuarios.' })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'La descripción no puede superar los 255 caracteres.' })
  @Transform(trimText)
  description?: string;

  @ApiPropertyOptional({ type: [String], enum: PermissionCode })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(PermissionCode, { each: true, message: 'Uno de los permisos enviados no es válido.' })
  permissionCodes?: PermissionCode[];
}

/** Datos para actualizar el nombre y la descripción de un rol. */
export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Editor de contenido' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres.' })
  @Transform(trimText)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'La descripción no puede superar los 255 caracteres.' })
  @Transform(trimText)
  description?: string;
}

/** Reemplaza por completo el conjunto de permisos de un rol. */
export class UpdateRolePermissionsDto {
  @ApiProperty({ type: [String], enum: PermissionCode })
  @IsArray()
  @ArrayUnique()
  @IsEnum(PermissionCode, { each: true, message: 'Uno de los permisos enviados no es válido.' })
  permissionCodes!: PermissionCode[];
}
