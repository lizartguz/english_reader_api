import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { RequireRoles } from '@/common/decorators/require-roles.decorator';
import { ApiResult } from '@/common/dto/api-result';
import { PermissionCode } from '@/common/enums/permission.enum';
import { RoleCode } from '@/common/enums/role-code.enum';
import { LogMessages } from '@/common/constants/messages.constants';
import { SystemLogQueryDto } from '../../application/dto/system-log-query.dto';
import { SystemLogResponseDto } from '../../application/dto/system-log-response.dto';
import { ListSystemLogsUseCase } from '../../application/use-cases/list-system-logs.use-case';

/**
 * Consulta de registros técnicos del sistema, de solo lectura.
 *
 * `SUPER_ADMIN` la tiene disponible por defecto; `ADMIN` solo si se le
 * otorga el permiso `system_logs.read` desde el editor de roles, según la
 * matriz inicial de `02-seguridad-autenticacion-autorizacion.md`.
 */
@ApiTags('Admin · Logs del sistema')
@ApiBearerAuth()
@RequireRoles(RoleCode.SuperAdmin, RoleCode.Admin)
@Controller({ path: 'admin/system-logs', version: '1' })
export class SystemLogsController {
  constructor(private readonly listUseCase: ListSystemLogsUseCase) {}

  @Get()
  @RequirePermissions(PermissionCode.SystemLogsRead)
  @ApiOperation({ summary: 'Listar los registros técnicos del sistema' })
  @ApiResponse({ status: 200, type: [SystemLogResponseDto] })
  async list(@Query() query: SystemLogQueryDto): Promise<ApiResult<SystemLogResponseDto[]>> {
    const { items, meta } = await this.listUseCase.execute(query);

    return ApiResult.paginated(items, meta, LogMessages.SystemLogsRetrieved);
  }
}
