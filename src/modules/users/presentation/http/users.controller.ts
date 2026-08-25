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
import { UserMessages } from '@/common/constants/messages.constants';
import { extractRequestContext } from '@/common/utils/request-context.util';
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from '@/common/types/authenticated-user.type';
import {
  AssignUserRolesDto,
  ChangeUserStatusDto,
  CreateUserDto,
  UpdateUserDto,
  UserAdminResponseDto,
  UserQueryDto,
} from '../../application/dto';
import {
  AssignUserRolesUseCase,
  ChangeUserStatusUseCase,
  CreateUserUseCase,
  DeleteUserUseCase,
  GetUserUseCase,
  ListUsersUseCase,
  UpdateUserUseCase,
} from '../../application/use-cases';

/**
 * CRUD administrativo de usuarios, consumido por React Admin.
 *
 * Restringido a `SUPER_ADMIN` y `ADMIN`. Las reglas finas sobre quién puede
 * gestionar a quién (protección de `SUPER_ADMIN` y de cuentas administrativas)
 * se evalúan en `UserAccessPolicyService`, no en este controlador.
 */
@ApiTags('Admin · Usuarios')
@ApiBearerAuth()
@RequireRoles(RoleCode.SuperAdmin, RoleCode.Admin)
@Controller({ path: 'admin/users', version: '1' })
export class UsersController {
  constructor(
    private readonly listUseCase: ListUsersUseCase,
    private readonly getUseCase: GetUserUseCase,
    private readonly createUseCase: CreateUserUseCase,
    private readonly updateUseCase: UpdateUserUseCase,
    private readonly changeStatusUseCase: ChangeUserStatusUseCase,
    private readonly assignRolesUseCase: AssignUserRolesUseCase,
    private readonly deleteUseCase: DeleteUserUseCase,
  ) {}

  @Get()
  @RequirePermissions(PermissionCode.UsersRead)
  @ApiOperation({ summary: 'Listar usuarios' })
  @ApiResponse({ status: 200, type: [UserAdminResponseDto] })
  async list(@Query() query: UserQueryDto): Promise<ApiResult<UserAdminResponseDto[]>> {
    const { items, meta } = await this.listUseCase.execute(query);

    return ApiResult.paginated(items, meta, UserMessages.Retrieved);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.UsersRead)
  @ApiOperation({ summary: 'Consultar un usuario' })
  @ApiResponse({ status: 200, type: UserAdminResponseDto })
  async findOne(@Param() params: IdParamDto): Promise<ApiResult<UserAdminResponseDto>> {
    const user = await this.getUseCase.execute(params.id);

    return ApiResult.of(user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PermissionCode.UsersCreate)
  @ApiOperation({
    summary: 'Crear un usuario',
    description: 'Asignar el rol ADMIN o SUPER_ADMIN exige el permiso `users.manage_admins`.',
  })
  @ApiResponse({ status: 201, type: UserAdminResponseDto })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<UserAdminResponseDto>> {
    const created = await this.createUseCase.execute(dto, actor, extractRequestContext(request));

    return ApiResult.of(created, UserMessages.Created);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.UsersUpdate)
  @ApiOperation({ summary: 'Actualizar el perfil de un usuario' })
  @ApiResponse({ status: 200, type: UserAdminResponseDto })
  async update(
    @Param() params: IdParamDto,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<UserAdminResponseDto>> {
    const updated = await this.updateUseCase.execute(
      params.id,
      dto,
      actor,
      extractRequestContext(request),
    );

    return ApiResult.of(updated, UserMessages.Updated);
  }

  @Patch(':id/status')
  @RequirePermissions(PermissionCode.UsersUpdate)
  @ApiOperation({
    summary: 'Cambiar el estado de un usuario',
    description: 'Bloquear o desactivar una cuenta revoca de inmediato sus sesiones activas.',
  })
  @ApiResponse({ status: 200, type: UserAdminResponseDto })
  async changeStatus(
    @Param() params: IdParamDto,
    @Body() dto: ChangeUserStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<UserAdminResponseDto>> {
    const updated = await this.changeStatusUseCase.execute(
      params.id,
      dto,
      actor,
      extractRequestContext(request),
    );

    return ApiResult.of(updated, UserMessages.StatusChanged);
  }

  @Patch(':id/roles')
  @RequirePermissions(PermissionCode.RolesAssign)
  @ApiOperation({ summary: 'Reemplazar los roles de un usuario' })
  @ApiResponse({ status: 200, type: UserAdminResponseDto })
  async assignRoles(
    @Param() params: IdParamDto,
    @Body() dto: AssignUserRolesDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<UserAdminResponseDto>> {
    const updated = await this.assignRolesUseCase.execute(
      params.id,
      dto,
      actor,
      extractRequestContext(request),
    );

    return ApiResult.of(updated, UserMessages.RolesAssigned);
  }

  @Delete(':id')
  @RequirePermissions(PermissionCode.UsersDelete)
  @ApiOperation({ summary: 'Eliminar un usuario' })
  async remove(
    @Param() params: IdParamDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<null>> {
    await this.deleteUseCase.execute(params.id, actor, extractRequestContext(request));

    return ApiResult.of(null, UserMessages.Deleted);
  }
}
