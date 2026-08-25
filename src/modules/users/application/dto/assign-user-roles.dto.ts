import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsEnum } from 'class-validator';
import { RoleCode } from '@/common/enums/role-code.enum';

/** Reemplaza por completo la lista de roles de un usuario. */
export class AssignUserRolesDto {
  @ApiProperty({ type: [String], enum: RoleCode })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debes asignar al menos un rol al usuario.' })
  @ArrayUnique()
  @IsEnum(RoleCode, { each: true, message: 'Uno de los roles enviados no es válido.' })
  roleCodes!: RoleCode[];
}
