import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayUnique, IsArray, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { UserStatus } from '@/common/enums/domain.enums';
import { RoleCode } from '@/common/enums/role-code.enum';
import { toArray } from '@/common/utils/transform.util';

/** Campos permitidos para ordenar el listado administrativo de usuarios. */
export const USER_ADMIN_SORT_FIELDS = ['createdAt', 'lastLoginAt', 'email', 'lastName'] as const;
export type UserAdminSortField = (typeof USER_ADMIN_SORT_FIELDS)[number];

/** Filtros y paginación para el listado administrativo de usuarios. */
export class UserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'El estado del filtro no es válido.' })
  status?: UserStatus;

  @ApiPropertyOptional({
    enum: RoleCode,
    isArray: true,
    description:
      'Uno o varios roles. Repetir el parámetro para filtrar por más de uno, por ejemplo `roleCode=ADMIN&roleCode=SUPER_ADMIN` para listar solo cuentas administrativas.',
  })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @ArrayUnique()
  @IsEnum(RoleCode, { each: true, message: 'El rol del filtro no es válido.' })
  roleCode?: RoleCode[];
}
