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
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { DictionaryMessages } from '@/common/constants/messages.constants';
import { PermissionCode } from '@/common/enums/permission.enum';
import { RoleCode } from '@/common/enums/role-code.enum';
import type { AuthenticatedRequest } from '@/common/types/authenticated-user.type';
import { extractRequestContext } from '@/common/utils/request-context.util';
import {
  AdminWordQueryDto,
  CreateTranslationDto,
  CreateWordDto,
  ReviewTranslationDto,
  ReviewWordDto,
  UpdateTranslationDto,
  UpdateWordDto,
  WordIdParamDto,
} from '../../application/dto';
import {
  CreateAdminWordUseCase,
  CreateWordTranslationUseCase,
  DeleteAdminWordUseCase,
  DeleteWordTranslationUseCase,
  GetAdminWordUseCase,
  ListAdminWordsUseCase,
  ListWordTranslationsUseCase,
  ReviewAdminWordUseCase,
  ReviewWordTranslationUseCase,
  UpdateAdminWordUseCase,
  UpdateWordTranslationUseCase,
} from '../../application/use-cases';
import {
  WordListItemResponseDto,
  WordLookupResponseDto,
  WordTranslationAdminResponseDto,
} from '../../domain/word-entry.mapper';

/**
 * Administración de palabras del diccionario.
 * Permite corregir y revisar datos provenientes de proveedores externos.
 */
@ApiTags('Admin · Palabras')
@ApiBearerAuth()
@RequireRoles(RoleCode.SuperAdmin, RoleCode.Admin)
@Controller({ path: 'admin/words', version: '1' })
export class AdminWordsController {
  constructor(
    private readonly listUseCase: ListAdminWordsUseCase,
    private readonly getUseCase: GetAdminWordUseCase,
    private readonly createUseCase: CreateAdminWordUseCase,
    private readonly updateUseCase: UpdateAdminWordUseCase,
    private readonly reviewUseCase: ReviewAdminWordUseCase,
    private readonly deleteUseCase: DeleteAdminWordUseCase,
    private readonly listTranslationsUseCase: ListWordTranslationsUseCase,
    private readonly createTranslationUseCase: CreateWordTranslationUseCase,
  ) {}

  @Get()
  @RequirePermissions(PermissionCode.WordsRead)
  @ApiOperation({ summary: 'Listar palabras del diccionario' })
  @ApiResponse({ status: 200, type: [WordListItemResponseDto] })
  async list(@Query() query: AdminWordQueryDto): Promise<ApiResult<WordListItemResponseDto[]>> {
    const { items, meta } = await this.listUseCase.execute(query);

    return ApiResult.paginated(items, meta, DictionaryMessages.WordsRetrieved);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.WordsRead)
  @ApiOperation({ summary: 'Consultar una palabra del diccionario' })
  @ApiResponse({ status: 200, type: WordLookupResponseDto })
  async findOne(@Param() params: IdParamDto): Promise<ApiResult<WordLookupResponseDto>> {
    const word = await this.getUseCase.execute(params.id);

    return ApiResult.of(word, DictionaryMessages.WordRetrieved);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PermissionCode.WordsCreate)
  @ApiOperation({ summary: 'Crear una palabra manualmente' })
  @ApiResponse({ status: 201, type: WordLookupResponseDto })
  async create(
    @Body() dto: CreateWordDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<WordLookupResponseDto>> {
    const created = await this.createUseCase.execute(dto, userId, extractRequestContext(request));

    return ApiResult.of(created, DictionaryMessages.WordCreated);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.WordsUpdate)
  @ApiOperation({ summary: 'Actualizar una palabra' })
  @ApiResponse({ status: 200, type: WordLookupResponseDto })
  async update(
    @Param() params: IdParamDto,
    @Body() dto: UpdateWordDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<WordLookupResponseDto>> {
    const updated = await this.updateUseCase.execute(
      params.id,
      dto,
      userId,
      extractRequestContext(request),
    );

    return ApiResult.of(updated, DictionaryMessages.WordUpdated);
  }

  @Patch(':id/review')
  @RequirePermissions(PermissionCode.WordsReview)
  @ApiOperation({ summary: 'Registrar revisión de una palabra' })
  @ApiResponse({ status: 200, type: WordLookupResponseDto })
  async review(
    @Param() params: IdParamDto,
    @Body() dto: ReviewWordDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<WordLookupResponseDto>> {
    const reviewed = await this.reviewUseCase.execute(
      params.id,
      dto,
      userId,
      extractRequestContext(request),
    );

    return ApiResult.of(reviewed, DictionaryMessages.WordReviewed);
  }

  @Delete(':id')
  @RequirePermissions(PermissionCode.WordsDelete)
  @ApiOperation({ summary: 'Eliminar una palabra' })
  async remove(
    @Param() params: IdParamDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<null>> {
    await this.deleteUseCase.execute(params.id, userId, extractRequestContext(request));

    return ApiResult.of(null, DictionaryMessages.WordDeleted);
  }

  @Get(':wordId/translations')
  @RequirePermissions(PermissionCode.TranslationsRead)
  @ApiOperation({ summary: 'Listar traducciones de una palabra' })
  @ApiResponse({ status: 200, type: [WordTranslationAdminResponseDto] })
  async listTranslations(
    @Param() params: WordIdParamDto,
    @Query() query: PaginationQueryDto,
  ): Promise<ApiResult<WordTranslationAdminResponseDto[]>> {
    const { items, meta } = await this.listTranslationsUseCase.execute(params.wordId, query);

    return ApiResult.paginated(items, meta, DictionaryMessages.TranslationsRetrieved);
  }

  @Post(':wordId/translations')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PermissionCode.TranslationsCreate)
  @ApiOperation({ summary: 'Crear traducción para una palabra' })
  @ApiResponse({ status: 201, type: WordTranslationAdminResponseDto })
  async createTranslation(
    @Param() params: WordIdParamDto,
    @Body() dto: CreateTranslationDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<WordTranslationAdminResponseDto>> {
    const created = await this.createTranslationUseCase.execute(
      params.wordId,
      dto,
      userId,
      extractRequestContext(request),
    );

    return ApiResult.of(created, DictionaryMessages.TranslationCreated);
  }
}

/** Administración directa de traducciones ya creadas. */
@ApiTags('Admin · Traducciones')
@ApiBearerAuth()
@RequireRoles(RoleCode.SuperAdmin, RoleCode.Admin)
@Controller({ path: 'admin/translations', version: '1' })
export class AdminTranslationsController {
  constructor(
    private readonly updateUseCase: UpdateWordTranslationUseCase,
    private readonly reviewUseCase: ReviewWordTranslationUseCase,
    private readonly deleteUseCase: DeleteWordTranslationUseCase,
  ) {}

  @Patch(':id')
  @RequirePermissions(PermissionCode.TranslationsUpdate)
  @ApiOperation({ summary: 'Actualizar una traducción' })
  @ApiResponse({ status: 200, type: WordTranslationAdminResponseDto })
  async update(
    @Param() params: IdParamDto,
    @Body() dto: UpdateTranslationDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<WordTranslationAdminResponseDto>> {
    const updated = await this.updateUseCase.execute(
      params.id,
      dto,
      userId,
      extractRequestContext(request),
    );

    return ApiResult.of(updated, DictionaryMessages.TranslationUpdated);
  }

  @Patch(':id/review')
  @RequirePermissions(PermissionCode.TranslationsReview)
  @ApiOperation({ summary: 'Registrar revisión de una traducción' })
  @ApiResponse({ status: 200, type: WordTranslationAdminResponseDto })
  async review(
    @Param() params: IdParamDto,
    @Body() dto: ReviewTranslationDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<WordTranslationAdminResponseDto>> {
    const reviewed = await this.reviewUseCase.execute(
      params.id,
      dto,
      userId,
      extractRequestContext(request),
    );

    return ApiResult.of(reviewed, DictionaryMessages.TranslationReviewed);
  }

  @Delete(':id')
  @RequirePermissions(PermissionCode.TranslationsDelete)
  @ApiOperation({ summary: 'Eliminar una traducción' })
  async remove(
    @Param() params: IdParamDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<null>> {
    await this.deleteUseCase.execute(params.id, userId, extractRequestContext(request));

    return ApiResult.of(null, DictionaryMessages.TranslationDeleted);
  }
}
