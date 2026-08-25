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
import { RoleMessages } from '@/common/constants/messages.constants';
import { extractRequestContext } from '@/common/utils/request-context.util';
import type { AuthenticatedRequest } from '@/common/types/authenticated-user.type';
import {
  CreateRoleDto,
  RoleQueryDto,
  RoleResponseDto,
  UpdateRoleDto,
  UpdateRolePermissionsDto,
} from '../../application/dto';
import {
  CreateRoleUseCase,
  DeleteRoleUseCase,
  GetRoleUseCase,
  ListRolesUseCase,
  UpdateRolePermissionsUseCase,
  UpdateRoleUseCase,
} from '../../application/use-cases';

/**
 * CRUD administrativo de roles, consumido por React Admin.
 *
 * Solo `SUPER_ADMIN` posee `roles.create`, `roles.update` y `roles.delete` en
 * la matriz inicial; `ADMIN` conserva `roles.read` para poblar selectores de
 * rol al gestionar usuarios cliente.
 */
@ApiTags('Admin · Roles')
@ApiBearerAuth()
@RequireRoles(RoleCode.SuperAdmin, RoleCode.Admin)
@Controller({ path: 'admin/roles', version: '1' })
export class RolesController {
  constructor(
    private readonly listUseCase: ListRolesUseCase,
    private readonly getUseCase: GetRoleUseCase,
    private readonly createUseCase: CreateRoleUseCase,
    private readonly updateUseCase: UpdateRoleUseCase,
    private readonly updatePermissionsUseCase: UpdateRolePermissionsUseCase,
    private readonly deleteUseCase: DeleteRoleUseCase,
  ) {}

  @Get()
  @RequirePermissions(PermissionCode.RolesRead)
  @ApiOperation({ summary: 'Listar roles' })
  @ApiResponse({ status: 200, type: [RoleResponseDto] })
  async list(@Query() query: RoleQueryDto): Promise<ApiResult<RoleResponseDto[]>> {
    const { items, meta } = await this.listUseCase.execute(query);

    return ApiResult.paginated(items, meta, RoleMessages.Retrieved);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.RolesRead)
  @ApiOperation({ summary: 'Consultar un rol' })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  async findOne(@Param() params: IdParamDto): Promise<ApiResult<RoleResponseDto>> {
    const role = await this.getUseCase.execute(params.id);

    return ApiResult.of(role);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PermissionCode.RolesCreate)
  @ApiOperation({ summary: 'Crear un rol personalizado' })
  @ApiResponse({ status: 201, type: RoleResponseDto })
  async create(
    @Body() dto: CreateRoleDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<RoleResponseDto>> {
    const created = await this.createUseCase.execute(dto, userId, extractRequestContext(request));

    return ApiResult.of(created, RoleMessages.Created);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.RolesUpdate)
  @ApiOperation({
    summary: 'Actualizar nombre y descripción de un rol',
    description: 'Los roles base del sistema (SUPER_ADMIN, ADMIN, CLIENT) no pueden renombrarse.',
  })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  async update(
    @Param() params: IdParamDto,
    @Body() dto: UpdateRoleDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<RoleResponseDto>> {
    const updated = await this.updateUseCase.execute(
      params.id,
      dto,
      userId,
      extractRequestContext(request),
    );

    return ApiResult.of(updated, RoleMessages.Updated);
  }

  @Patch(':id/permissions')
  @RequirePermissions(PermissionCode.RolesUpdate)
  @ApiOperation({
    summary: 'Reemplazar los permisos de un rol',
    description: 'Aplica incluso a roles base: es el mecanismo para afinar su matriz de acceso.',
  })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  async updatePermissions(
    @Param() params: IdParamDto,
    @Body() dto: UpdateRolePermissionsDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<RoleResponseDto>> {
    const updated = await this.updatePermissionsUseCase.execute(
      params.id,
      dto,
      userId,
      extractRequestContext(request),
    );

    return ApiResult.of(updated, RoleMessages.PermissionsUpdated);
  }

  @Delete(':id')
  @RequirePermissions(PermissionCode.RolesDelete)
  @ApiOperation({ summary: 'Eliminar un rol personalizado' })
  async remove(
    @Param() params: IdParamDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<null>> {
    await this.deleteUseCase.execute(params.id, userId, extractRequestContext(request));

    return ApiResult.of(null, RoleMessages.Deleted);
  }
}
