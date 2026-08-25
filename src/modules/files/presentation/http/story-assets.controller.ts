import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { RequireRoles } from '@/common/decorators/require-roles.decorator';
import { ApiResult } from '@/common/dto/api-result';
import { IdParamDto } from '@/common/dto/id-param.dto';
import { FileMessages } from '@/common/constants/messages.constants';
import { PermissionCode } from '@/common/enums/permission.enum';
import { RoleCode } from '@/common/enums/role-code.enum';
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from '@/common/types/authenticated-user.type';
import { extractRequestContext } from '@/common/utils/request-context.util';
import { StoryAssetResponseDto } from '../../domain/story-asset.mapper';
import { StoryAssetStoryParamDto, UploadStoryAssetDto } from '../../application/dto';
import {
  DeleteStoryAssetUseCase,
  GetStoryAssetFileUseCase,
  UploadStoryAssetUseCase,
} from '../../application/use-cases';
import type { MemoryUploadFile } from '../../infrastructure/storage/local-file-storage.service';

/** Carga administrativa de recursos asociados a historias. */
@ApiTags('Admin · Recursos de historias')
@ApiBearerAuth()
@RequireRoles(RoleCode.SuperAdmin, RoleCode.Admin)
@Controller({ path: 'admin/stories/:storyId/assets', version: '1' })
export class AdminStoryAssetsController {
  constructor(private readonly uploadUseCase: UploadStoryAssetUseCase) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @RequirePermissions(PermissionCode.FilesUpload)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Cargar recurso de historia' })
  @ApiBody({ type: UploadStoryAssetDto })
  @ApiResponse({ status: 201, type: StoryAssetResponseDto })
  async upload(
    @Param() params: StoryAssetStoryParamDto,
    @Body() dto: UploadStoryAssetDto,
    @UploadedFile() file: MemoryUploadFile,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<StoryAssetResponseDto>> {
    const created = await this.uploadUseCase.execute(
      params.storyId,
      dto,
      file,
      userId,
      extractRequestContext(request),
    );

    return ApiResult.of(created, FileMessages.Uploaded);
  }
}

/** Entrega y eliminación de archivos de recursos ya registrados. */
@ApiTags('Archivos')
@ApiBearerAuth()
@Controller({ path: 'files/story-assets', version: '1' })
export class StoryAssetFilesController {
  constructor(
    private readonly getFileUseCase: GetStoryAssetFileUseCase,
    private readonly deleteUseCase: DeleteStoryAssetUseCase,
  ) {}

  @Get(':id')
  @Header('Cache-Control', 'private, max-age=300')
  @ApiOperation({ summary: 'Descargar recurso de historia' })
  async download(
    @Param() params: IdParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.getFileUseCase.execute(params.id, user);

    response.contentType(file.mimeType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.fileName)}"`,
    );
    response.send(file.buffer);
  }

  @Delete(':id')
  @RequireRoles(RoleCode.SuperAdmin, RoleCode.Admin)
  @RequirePermissions(PermissionCode.FilesDelete)
  @ApiOperation({ summary: 'Eliminar recurso de historia' })
  async remove(
    @Param() params: IdParamDto,
    @CurrentUser('id') userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ApiResult<null>> {
    await this.deleteUseCase.execute(params.id, userId, extractRequestContext(request));

    return ApiResult.of(null, FileMessages.Deleted);
  }
}
