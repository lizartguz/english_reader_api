import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { RequireRoles } from '@/common/decorators/require-roles.decorator';
import { ApiResult } from '@/common/dto/api-result';
import { IdParamDto } from '@/common/dto/id-param.dto';
import { PermissionCode } from '@/common/enums/permission.enum';
import { RoleCode } from '@/common/enums/role-code.enum';
import { ReadingLevelMessages } from '@/common/constants/messages.constants';
import { extractRequestContext } from '@/common/utils/request-context.util';
import type { AuthenticatedRequest } from '@/common/types/authenticated-user.type';
import {
  CreateReadingLevelDto,
  ReadingLevelQueryDto,
  ReadingLevelResponseDto,
  UpdateReadingLevelDto,
} from '../../application/dto';
import {
  CreateReadingLevelUseCase,
  DeleteReadingLevelUseCase,
  GetReadingLevelUseCase,
  ListReadingLevelsUseCase,
  UpdateReadingLevelUseCase,
} from '../../application/use-cases/reading-levels.use-cases';

/**
 * CRUD administrativo de niveles de lectura, consumido por React Admin.
 * Restringido a usuarios con rol `SUPER_ADMIN` o `ADMIN`.
 */
@ApiTags('Admin · Niveles de lectura')
@ApiBearerAuth()
@RequireRoles(RoleCode.SuperAdmin, RoleCode.Admin)
@Controller({ path: 'admin/reading-levels', version: '1' })
export class ReadingLevelsController {
  constructor(
    private readonly listUseCase: ListReadingLevelsUseCase,
    private readonly getUseCase: GetReadingLevelUseCase,
    private readonly createUseCase: CreateReadingLevelUseCase,
    private readonly updateUseCase: UpdateReadingLevelUseCase,
    private readonly deleteUseCase: DeleteReadingLevelUseCase,
  ) {}

  @Get()
  @RequirePermissions(PermissionCode.ReadingLevelsRead)
  @ApiOperation({ summary: 'Listar niveles de lectura' })
  @ApiResponse({ status: 200, type: [ReadingLevelResponseDto] })
  async list(@Query() query: ReadingLevelQueryDto): Promise<ApiResult<ReadingLevelResponseDto[]>> {
    const { items, meta } = await this.listUseCase.execute(query);

    return ApiResult.paginated(items, meta, ReadingLevelMessages.Retrieved);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.ReadingLevelsRead)
  @ApiOperation({ summary: 'Consultar un nivel de lectura' })
  @ApiResponse({ status: 200, type: ReadingLevelResponseDto })
  async findOne(@Param() params: IdParamDto): Promise<ApiResult<ReadingLevelResponseDto>> {
    const level = await this.getUseCase.execute(params.id);

    return ApiResult.of(level);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PermissionCode.ReadingLevelsCreate)
  @ApiOperation({ summary: 'Crear un nivel de lectura' })
  @ApiResponse({ status: 201, type: ReadingLevelResponseDto })
  async create(
    @Body() dto: CreateReadingLevelDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<ReadingLevelResponseDto>> {
    const created = await this.createUseCase.execute(dto, userId, extractRequestContext(request));

    return ApiResult.of(created, ReadingLevelMessages.Created);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.ReadingLevelsUpdate)
  @ApiOperation({ summary: 'Actualizar un nivel de lectura' })
  @ApiResponse({ status: 200, type: ReadingLevelResponseDto })
  async update(
    @Param() params: IdParamDto,
    @Body() dto: UpdateReadingLevelDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<ReadingLevelResponseDto>> {
    const updated = await this.updateUseCase.execute(
      params.id,
      dto,
      userId,
      extractRequestContext(request),
    );

    return ApiResult.of(updated, ReadingLevelMessages.Updated);
  }

  @Delete(':id')
  @RequirePermissions(PermissionCode.ReadingLevelsDelete)
  @ApiOperation({ summary: 'Eliminar un nivel de lectura' })
  async remove(
    @Param() params: IdParamDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<null>> {
    await this.deleteUseCase.execute(params.id, userId, extractRequestContext(request));

    return ApiResult.of(null, ReadingLevelMessages.Deleted);
  }
}
