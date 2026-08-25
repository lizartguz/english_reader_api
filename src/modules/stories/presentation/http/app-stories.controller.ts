import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequireRoles } from '@/common/decorators/require-roles.decorator';
import { ApiResult } from '@/common/dto/api-result';
import { IdParamDto } from '@/common/dto/id-param.dto';
import { StoryMessages } from '@/common/constants/messages.constants';
import { RoleCode } from '@/common/enums/role-code.enum';
import {
  AppStoryDetailResponseDto,
  AppStoryListItemResponseDto,
  AppStoryQueryDto,
} from '../../application/dto';
import { GetAppStoryUseCase, ListAppStoriesUseCase } from '../../application/use-cases';

/** Endpoints de historias publicados para la aplicación Flutter. */
@ApiTags('App · Historias')
@ApiBearerAuth()
@RequireRoles(RoleCode.Client)
@Controller({ path: 'app/stories', version: '1' })
export class AppStoriesController {
  constructor(
    private readonly listUseCase: ListAppStoriesUseCase,
    private readonly getUseCase: GetAppStoryUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar historias publicadas' })
  @ApiResponse({ status: 200, type: [AppStoryListItemResponseDto] })
  async list(@Query() query: AppStoryQueryDto): Promise<ApiResult<AppStoryListItemResponseDto[]>> {
    const { items, meta } = await this.listUseCase.execute(query);

    return ApiResult.paginated(items, meta, StoryMessages.Retrieved);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar historia publicada para lectura' })
  @ApiResponse({ status: 200, type: AppStoryDetailResponseDto })
  async findOne(@Param() params: IdParamDto): Promise<ApiResult<AppStoryDetailResponseDto>> {
    const story = await this.getUseCase.execute(params.id);

    return ApiResult.of(story, StoryMessages.Retrieved);
  }
}
