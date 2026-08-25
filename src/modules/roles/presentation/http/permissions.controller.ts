import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { RequireRoles } from '@/common/decorators/require-roles.decorator';
import { ApiResult } from '@/common/dto/api-result';
import { PermissionCode } from '@/common/enums/permission.enum';
import { RoleCode } from '@/common/enums/role-code.enum';
import { RoleMessages } from '@/common/constants/messages.constants';
import { PermissionResponseDto } from '../../application/dto/role-response.dto';
import { ListPermissionsUseCase } from '../../application/use-cases/list-permissions.use-case';

/** Catálogo de permisos, de solo lectura, usado por el editor de roles. */
@ApiTags('Admin · Permisos')
@ApiBearerAuth()
@RequireRoles(RoleCode.SuperAdmin, RoleCode.Admin)
@Controller({ path: 'admin/permissions', version: '1' })
export class PermissionsController {
  constructor(private readonly listUseCase: ListPermissionsUseCase) {}

  @Get()
  @RequirePermissions(PermissionCode.PermissionsRead)
  @ApiOperation({ summary: 'Listar el catálogo de permisos' })
  @ApiResponse({ status: 200, type: [PermissionResponseDto] })
  async list(): Promise<ApiResult<PermissionResponseDto[]>> {
    const permissions = await this.listUseCase.execute();

    return ApiResult.of(permissions, RoleMessages.Retrieved);
  }
}
