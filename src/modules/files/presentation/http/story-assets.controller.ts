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
import { StoryAssetType } from '@/common/enums/domain.enums';
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

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const MAX_MULTIPART_FILE_SIZE_BYTES =
  Math.max(toInt(process.env.MAX_IMAGE_SIZE_MB, 10), toInt(process.env.MAX_AUDIO_SIZE_MB, 15)) *
  1024 *
  1024;

/** Carga administrativa de recursos asociados a historias. */
@ApiTags('Admin · Recursos de historias')
@ApiBearerAuth()
@RequireRoles(RoleCode.SuperAdmin, RoleCode.Admin)
@Controller({ path: 'admin/stories/:storyId/assets', version: '1' })
export class AdminStoryAssetsController {
  constructor(private readonly uploadUseCase: UploadStoryAssetUseCase) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_MULTIPART_FILE_SIZE_BYTES },
    }),
  )
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
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Length', file.buffer.length);
    response.setHeader(
      'Content-Disposition',
      this.buildContentDisposition(file.assetType, file.fileName),
    );
    response.send(file.buffer);
  }

  private buildContentDisposition(assetType: StoryAssetType, fileName: string): string {
    const disposition = assetType === StoryAssetType.attachment ? 'attachment' : 'inline';
    const fallbackName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'archivo';
    const encodedName = encodeURIComponent(fileName);

    return `${disposition}; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`;
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
