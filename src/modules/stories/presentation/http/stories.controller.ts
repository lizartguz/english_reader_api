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
import { StoryMessages } from '@/common/constants/messages.constants';
import { extractRequestContext } from '@/common/utils/request-context.util';
import type { AuthenticatedRequest } from '@/common/types/authenticated-user.type';
import {
  ChangeStoryStatusDto,
  CreateStoryDto,
  StoryDetailResponseDto,
  StoryListItemResponseDto,
  StoryQueryDto,
  UpdateStoryDto,
} from '../../application/dto';
import {
  ChangeStoryStatusUseCase,
  CreateStoryUseCase,
  DeleteStoryUseCase,
  GetStoryUseCase,
  ListStoriesUseCase,
  UpdateStoryUseCase,
} from '../../application/use-cases';

/**
 * CRUD administrativo de historias, consumido por React Admin.
 * Restringido a usuarios con rol `SUPER_ADMIN` o `ADMIN`.
 */
@ApiTags('Admin · Historias')
@ApiBearerAuth()
@RequireRoles(RoleCode.SuperAdmin, RoleCode.Admin)
@Controller({ path: 'admin/stories', version: '1' })
export class StoriesController {
  constructor(
    private readonly listUseCase: ListStoriesUseCase,
    private readonly getUseCase: GetStoryUseCase,
    private readonly createUseCase: CreateStoryUseCase,
    private readonly updateUseCase: UpdateStoryUseCase,
    private readonly changeStatusUseCase: ChangeStoryStatusUseCase,
    private readonly deleteUseCase: DeleteStoryUseCase,
  ) {}

  @Get()
  @RequirePermissions(PermissionCode.StoriesRead)
  @ApiOperation({ summary: 'Listar historias' })
  @ApiResponse({ status: 200, type: [StoryListItemResponseDto] })
  async list(@Query() query: StoryQueryDto): Promise<ApiResult<StoryListItemResponseDto[]>> {
    const { items, meta } = await this.listUseCase.execute(query);

    return ApiResult.paginated(items, meta, StoryMessages.Retrieved);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.StoriesRead)
  @ApiOperation({ summary: 'Consultar una historia' })
  @ApiResponse({ status: 200, type: StoryDetailResponseDto })
  async findOne(@Param() params: IdParamDto): Promise<ApiResult<StoryDetailResponseDto>> {
    const story = await this.getUseCase.execute(params.id);

    return ApiResult.of(story);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PermissionCode.StoriesCreate)
  @ApiOperation({ summary: 'Crear una historia en borrador' })
  @ApiResponse({ status: 201, type: StoryDetailResponseDto })
  async create(
    @Body() dto: CreateStoryDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<StoryDetailResponseDto>> {
    const created = await this.createUseCase.execute(dto, userId, extractRequestContext(request));

    return ApiResult.of(created, StoryMessages.Created);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.StoriesUpdate)
  @ApiOperation({ summary: 'Actualizar una historia' })
  @ApiResponse({ status: 200, type: StoryDetailResponseDto })
  async update(
    @Param() params: IdParamDto,
    @Body() dto: UpdateStoryDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<StoryDetailResponseDto>> {
    const updated = await this.updateUseCase.execute(
      params.id,
      dto,
      userId,
      extractRequestContext(request),
    );

    return ApiResult.of(updated, StoryMessages.Updated);
  }

  @Patch(':id/status')
  @RequirePermissions(PermissionCode.StoriesPublish)
  @ApiOperation({ summary: 'Cambiar el estado de publicación de una historia' })
  @ApiResponse({ status: 200, type: StoryDetailResponseDto })
  async changeStatus(
    @Param() params: IdParamDto,
    @Body() dto: ChangeStoryStatusDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<StoryDetailResponseDto>> {
    const updated = await this.changeStatusUseCase.execute(
      params.id,
      dto.status,
      userId,
      extractRequestContext(request),
    );

    return ApiResult.of(updated, StoryMessages.StatusChanged);
  }

  @Delete(':id')
  @RequirePermissions(PermissionCode.StoriesDelete)
  @ApiOperation({ summary: 'Eliminar una historia' })
  async remove(
    @Param() params: IdParamDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<null>> {
    await this.deleteUseCase.execute(params.id, userId, extractRequestContext(request));

    return ApiResult.of(null, StoryMessages.Deleted);
  }
}
