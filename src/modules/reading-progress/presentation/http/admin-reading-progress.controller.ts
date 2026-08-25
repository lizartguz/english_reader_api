import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { RequireRoles } from '@/common/decorators/require-roles.decorator';
import { ApiResult } from '@/common/dto/api-result';
import { ReadingProgressMessages } from '@/common/constants/messages.constants';
import { PermissionCode } from '@/common/enums/permission.enum';
import { RoleCode } from '@/common/enums/role-code.enum';
import { AdminReadingProgressQueryDto } from '../../application/dto';
import { ListAdminReadingProgressUseCase } from '../../application/use-cases';
import { AdminReadingProgressResponseDto } from '../../domain/reading-progress.mapper';

/** Consulta administrativa de avances de lectura de clientes. */
@ApiTags('Admin · Progreso de lectura')
@ApiBearerAuth()
@RequireRoles(RoleCode.SuperAdmin, RoleCode.Admin)
@Controller({ path: 'admin/reading-progress', version: '1' })
export class AdminReadingProgressController {
  constructor(private readonly listUseCase: ListAdminReadingProgressUseCase) {}

  @Get()
  @RequirePermissions(PermissionCode.ReadingProgressRead)
  @ApiOperation({ summary: 'Listar progreso de lectura de usuarios' })
  @ApiResponse({ status: 200, type: [AdminReadingProgressResponseDto] })
  async list(
    @Query() query: AdminReadingProgressQueryDto,
  ): Promise<ApiResult<AdminReadingProgressResponseDto[]>> {
    const { items, meta } = await this.listUseCase.execute(query);

    return ApiResult.paginated(items, meta, ReadingProgressMessages.Retrieved);
  }
}
