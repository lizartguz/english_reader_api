import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequireRoles } from '@/common/decorators/require-roles.decorator';
import { ApiResult } from '@/common/dto/api-result';
import { ReadingProgressMessages } from '@/common/constants/messages.constants';
import { RoleCode } from '@/common/enums/role-code.enum';
import { ReadingProgressResponseDto } from '../../domain/reading-progress.mapper';
import { ReadingProgressStoryParamDto, UpdateReadingProgressDto } from '../../application/dto';
import {
  GetReadingProgressUseCase,
  ListReadingProgressUseCase,
  SaveReadingProgressUseCase,
} from '../../application/use-cases';

/** Endpoints de sincronización de progreso consumidos por Flutter. */
@ApiTags('App · Progreso de lectura')
@ApiBearerAuth()
@RequireRoles(RoleCode.Client)
@Controller({ path: 'app/reading-progress', version: '1' })
export class AppReadingProgressController {
  constructor(
    private readonly listUseCase: ListReadingProgressUseCase,
    private readonly getUseCase: GetReadingProgressUseCase,
    private readonly saveUseCase: SaveReadingProgressUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar progreso del cliente en historias publicadas' })
  @ApiResponse({ status: 200, type: [ReadingProgressResponseDto] })
  async list(
    @CurrentUser('id') userId: string,
  ): Promise<ApiResult<ReadingProgressResponseDto[]>> {
    const items = await this.listUseCase.execute(userId);

    return ApiResult.of(items, ReadingProgressMessages.Retrieved);
  }

  @Get(':storyId')
  @ApiOperation({ summary: 'Obtener progreso de una historia' })
  @ApiResponse({ status: 200, type: ReadingProgressResponseDto })
  async get(
    @CurrentUser('id') userId: string,
    @Param() params: ReadingProgressStoryParamDto,
  ): Promise<ApiResult<ReadingProgressResponseDto>> {
    const progress = await this.getUseCase.execute(userId, params.storyId);

    return ApiResult.of(progress, ReadingProgressMessages.Retrieved);
  }

  @Patch(':storyId')
  @ApiOperation({ summary: 'Guardar progreso de una historia' })
  @ApiResponse({ status: 200, type: ReadingProgressResponseDto })
  async save(
    @CurrentUser('id') userId: string,
    @Param() params: ReadingProgressStoryParamDto,
    @Body() dto: UpdateReadingProgressDto,
  ): Promise<ApiResult<ReadingProgressResponseDto>> {
    const progress = await this.saveUseCase.execute(userId, params.storyId, dto);

    return ApiResult.of(progress, ReadingProgressMessages.Saved);
  }
}
