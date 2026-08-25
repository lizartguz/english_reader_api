import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequireRoles } from '@/common/decorators/require-roles.decorator';
import { ApiResult } from '@/common/dto/api-result';
import { IdParamDto } from '@/common/dto/id-param.dto';
import { VocabularyMessages } from '@/common/constants/messages.constants';
import { RoleCode } from '@/common/enums/role-code.enum';
import { SaveVocabularyDto, UpdateVocabularyDto, VocabularyQueryDto } from '../../application/dto';
import {
  ListVocabularyUseCase,
  RemoveVocabularyUseCase,
  SaveVocabularyUseCase,
  UpdateVocabularyUseCase,
} from '../../application/use-cases';
import { VocabularyResponseDto } from '../../domain/vocabulary.mapper';

/** Endpoints del vocabulario personal consumidos por Flutter. */
@ApiTags('App · Vocabulario')
@ApiBearerAuth()
@RequireRoles(RoleCode.Client)
@Controller({ path: 'app/vocabulary', version: '1' })
export class AppVocabularyController {
  constructor(
    private readonly listUseCase: ListVocabularyUseCase,
    private readonly saveUseCase: SaveVocabularyUseCase,
    private readonly updateUseCase: UpdateVocabularyUseCase,
    private readonly removeUseCase: RemoveVocabularyUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar vocabulario personal' })
  @ApiResponse({ status: 200, type: [VocabularyResponseDto] })
  async list(
    @CurrentUser('id') userId: string,
    @Query() query: VocabularyQueryDto,
  ): Promise<ApiResult<VocabularyResponseDto[]>> {
    const { items, meta } = await this.listUseCase.execute(userId, query);

    return ApiResult.paginated(items, meta, VocabularyMessages.Retrieved);
  }

  @Post()
  @ApiOperation({ summary: 'Guardar palabra en vocabulario personal' })
  @ApiResponse({ status: 201, type: VocabularyResponseDto })
  async save(
    @CurrentUser('id') userId: string,
    @Body() dto: SaveVocabularyDto,
  ): Promise<ApiResult<VocabularyResponseDto>> {
    const { item, alreadySaved } = await this.saveUseCase.execute(userId, dto);

    return ApiResult.of(
      item,
      alreadySaved ? VocabularyMessages.AlreadySaved : VocabularyMessages.Saved,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar palabra guardada' })
  @ApiResponse({ status: 200, type: VocabularyResponseDto })
  async update(
    @Param() params: IdParamDto,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateVocabularyDto,
  ): Promise<ApiResult<VocabularyResponseDto>> {
    const updated = await this.updateUseCase.execute(params.id, userId, dto);

    return ApiResult.of(updated, VocabularyMessages.Updated);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar palabra guardada' })
  async remove(
    @Param() params: IdParamDto,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResult<null>> {
    await this.removeUseCase.execute(params.id, userId);

    return ApiResult.of(null, VocabularyMessages.Removed);
  }
}
