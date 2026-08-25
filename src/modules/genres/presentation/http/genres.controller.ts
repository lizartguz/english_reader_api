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
import { GenreMessages } from '@/common/constants/messages.constants';
import { extractRequestContext } from '@/common/utils/request-context.util';
import type { AuthenticatedRequest } from '@/common/types/authenticated-user.type';
import {
  CreateGenreDto,
  GenreQueryDto,
  GenreResponseDto,
  UpdateGenreDto,
} from '../../application/dto';
import {
  CreateGenreUseCase,
  DeleteGenreUseCase,
  GetGenreUseCase,
  ListGenresUseCase,
  UpdateGenreUseCase,
} from '../../application/use-cases/genres.use-cases';

/**
 * CRUD administrativo de géneros literarios, consumido por React Admin.
 * Restringido a usuarios con rol `SUPER_ADMIN` o `ADMIN`.
 */
@ApiTags('Admin · Géneros')
@ApiBearerAuth()
@RequireRoles(RoleCode.SuperAdmin, RoleCode.Admin)
@Controller({ path: 'admin/genres', version: '1' })
export class GenresController {
  constructor(
    private readonly listUseCase: ListGenresUseCase,
    private readonly getUseCase: GetGenreUseCase,
    private readonly createUseCase: CreateGenreUseCase,
    private readonly updateUseCase: UpdateGenreUseCase,
    private readonly deleteUseCase: DeleteGenreUseCase,
  ) {}

  @Get()
  @RequirePermissions(PermissionCode.GenresRead)
  @ApiOperation({ summary: 'Listar géneros literarios' })
  @ApiResponse({ status: 200, type: [GenreResponseDto] })
  async list(@Query() query: GenreQueryDto): Promise<ApiResult<GenreResponseDto[]>> {
    const { items, meta } = await this.listUseCase.execute(query);

    return ApiResult.paginated(items, meta, GenreMessages.Retrieved);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.GenresRead)
  @ApiOperation({ summary: 'Consultar un género literario' })
  @ApiResponse({ status: 200, type: GenreResponseDto })
  async findOne(@Param() params: IdParamDto): Promise<ApiResult<GenreResponseDto>> {
    const genre = await this.getUseCase.execute(params.id);

    return ApiResult.of(genre);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PermissionCode.GenresCreate)
  @ApiOperation({ summary: 'Crear un género literario' })
  @ApiResponse({ status: 201, type: GenreResponseDto })
  async create(
    @Body() dto: CreateGenreDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<GenreResponseDto>> {
    const created = await this.createUseCase.execute(dto, userId, extractRequestContext(request));

    return ApiResult.of(created, GenreMessages.Created);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.GenresUpdate)
  @ApiOperation({ summary: 'Actualizar un género literario' })
  @ApiResponse({ status: 200, type: GenreResponseDto })
  async update(
    @Param() params: IdParamDto,
    @Body() dto: UpdateGenreDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<GenreResponseDto>> {
    const updated = await this.updateUseCase.execute(
      params.id,
      dto,
      userId,
      extractRequestContext(request),
    );

    return ApiResult.of(updated, GenreMessages.Updated);
  }

  @Delete(':id')
  @RequirePermissions(PermissionCode.GenresDelete)
  @ApiOperation({ summary: 'Eliminar un género literario' })
  async remove(
    @Param() params: IdParamDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<null>> {
    await this.deleteUseCase.execute(params.id, userId, extractRequestContext(request));

    return ApiResult.of(null, GenreMessages.Deleted);
  }
}
