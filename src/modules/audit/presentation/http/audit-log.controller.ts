import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { RequireRoles } from '@/common/decorators/require-roles.decorator';
import { ApiResult } from '@/common/dto/api-result';
import { PermissionCode } from '@/common/enums/permission.enum';
import { RoleCode } from '@/common/enums/role-code.enum';
import { LogMessages } from '@/common/constants/messages.constants';
import { AuditLogQueryDto, AuditLogResponseDto } from '../../application/dto';
import { ListAuditLogsUseCase } from '../../application/use-cases';

/**
 * Consulta de auditoría administrativa, de solo lectura.
 *
 * `SUPER_ADMIN` la tiene disponible por defecto; `ADMIN` solo si se le otorga
 * el permiso `audit.read` desde el editor de roles, según la matriz inicial
 * de `02-seguridad-autenticacion-autorizacion.md`.
 */
@ApiTags('Admin · Auditoría')
@ApiBearerAuth()
@RequireRoles(RoleCode.SuperAdmin, RoleCode.Admin)
@Controller({ path: 'admin/audit-logs', version: '1' })
export class AuditLogController {
  constructor(private readonly listUseCase: ListAuditLogsUseCase) {}

  @Get()
  @RequirePermissions(PermissionCode.AuditRead)
  @ApiOperation({ summary: 'Listar la auditoría administrativa' })
  @ApiResponse({ status: 200, type: [AuditLogResponseDto] })
  async list(@Query() query: AuditLogQueryDto): Promise<ApiResult<AuditLogResponseDto[]>> {
    const { items, meta } = await this.listUseCase.execute(query);

    return ApiResult.paginated(items, meta, LogMessages.AuditRetrieved);
  }
}
