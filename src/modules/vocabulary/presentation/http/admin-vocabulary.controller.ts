import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { RequireRoles } from '@/common/decorators/require-roles.decorator';
import { ApiResult } from '@/common/dto/api-result';
import { VocabularyMessages } from '@/common/constants/messages.constants';
import { PermissionCode } from '@/common/enums/permission.enum';
import { RoleCode } from '@/common/enums/role-code.enum';
import { AdminVocabularyQueryDto } from '../../application/dto';
import { ListAdminVocabularyUseCase } from '../../application/use-cases';
import { AdminVocabularyResponseDto } from '../../domain/vocabulary.mapper';

/** Consulta administrativa del vocabulario guardado por clientes. */
@ApiTags('Admin · Vocabulario')
@ApiBearerAuth()
@RequireRoles(RoleCode.SuperAdmin, RoleCode.Admin)
@Controller({ path: 'admin/vocabulary', version: '1' })
export class AdminVocabularyController {
  constructor(private readonly listUseCase: ListAdminVocabularyUseCase) {}

  @Get()
  @RequirePermissions(PermissionCode.VocabularyRead)
  @ApiOperation({ summary: 'Listar vocabulario de usuarios' })
  @ApiResponse({ status: 200, type: [AdminVocabularyResponseDto] })
  async list(
    @Query() query: AdminVocabularyQueryDto,
  ): Promise<ApiResult<AdminVocabularyResponseDto[]>> {
    const { items, meta } = await this.listUseCase.execute(query);

    return ApiResult.paginated(items, meta, VocabularyMessages.Retrieved);
  }
}
