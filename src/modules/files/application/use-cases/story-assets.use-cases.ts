import { Injectable } from '@nestjs/common';
import { FileAccessScope, StoryStatus } from '@/common/enums/domain.enums';
import { RoleCode } from '@/common/enums/role-code.enum';
import { PermissionCode } from '@/common/enums/permission.enum';
import { FileMessages, StoryMessages } from '@/common/constants/messages.constants';
import { AuditAction, AuditEntityType } from '@/common/constants/audit-actions.constants';
import { AppException } from '@/common/exceptions/app.exception';
import type { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import type { RequestContext } from '@/common/utils/request-context.util';
import { AuditService } from '@/modules/audit/application/audit.service';
import { toStoryAssetResponse } from '../../domain/story-asset.mapper';
import { FilesRepository } from '../../infrastructure/persistence/files.repository';
import {
  LocalFileStorageService,
  type MemoryUploadFile,
} from '../../infrastructure/storage/local-file-storage.service';
import type { UploadStoryAssetDto } from '../dto';

/** Carga y registra un recurso asociado a una historia desde React Admin. */
@Injectable()
export class UploadStoryAssetUseCase {
  constructor(
    private readonly repository: FilesRepository,
    private readonly storage: LocalFileStorageService,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    storyId: string,
    dto: UploadStoryAssetDto,
    file: MemoryUploadFile,
    actorUserId: string,
    context: RequestContext,
  ) {
    const story = await this.repository.findStoryForAsset(storyId);

    if (!story) throw AppException.notFound(StoryMessages.NotFound);

    const stored = await this.storage.storeStoryAsset(storyId, dto.type, file);
    const created = await this.repository.createStoryAsset({
      storyId,
      type: dto.type,
      storageDisk: stored.storageDisk,
      storagePath: stored.storagePath,
      originalFileName: file.originalname,
      mimeType: stored.mimeType,
      fileSizeBytes: stored.fileSizeBytes,
      accessScope: dto.accessScope ?? FileAccessScope.private,
      metadata: stored.metadata,
      sortOrder: dto.sortOrder ?? 0,
    });

    await this.auditService.record({
      actorUserId,
      action: AuditAction.StoryAssetUploaded,
      entityType: AuditEntityType.StoryAsset,
      entityId: created.id,
      summary: `Se cargó un recurso para la historia "${story.title}".`,
      metadata: { storyId, type: dto.type },
      context,
    });

    return toStoryAssetResponse(created);
  }
}

/** Resuelve un archivo físico validando primero el acceso del solicitante. */
@Injectable()
export class GetStoryAssetFileUseCase {
  constructor(
    private readonly repository: FilesRepository,
    private readonly storage: LocalFileStorageService,
  ) {}

  async execute(id: string, user: AuthenticatedUser) {
    const asset = await this.repository.findStoryAssetById(id);

    if (!asset || !asset.storagePath) throw AppException.notFound(FileMessages.NotFound);

    this.assertCanRead(asset, user);

    const buffer = await this.storage.read(asset.storagePath);

    return {
      buffer,
      mimeType: asset.mimeType,
      fileName: asset.originalFileName ?? `${asset.id}`,
      assetType: asset.type,
    };
  }

  private assertCanRead(
    asset: Awaited<ReturnType<FilesRepository['findStoryAssetById']>>,
    user: AuthenticatedUser,
  ): void {
    if (!asset) throw AppException.notFound(FileMessages.NotFound);

    if (user.roles.includes(RoleCode.SuperAdmin)) return;

    if (user.roles.includes(RoleCode.Admin)) {
      if (user.permissions.includes(PermissionCode.FilesRead)) return;
      throw AppException.forbidden();
    }

    if (
      user.roles.includes(RoleCode.Client) &&
      asset.story.deletedAt === null &&
      asset.story.status === StoryStatus.published &&
      this.isClientReadableScope(asset.accessScope)
    ) {
      return;
    }

    throw AppException.forbidden();
  }

  private isClientReadableScope(accessScope: FileAccessScope): boolean {
    // En el almacenamiento local vigente ambos alcances requieren autenticación.
    return accessScope === FileAccessScope.private || accessScope === FileAccessScope.public;
  }
}

/** Elimina lógicamente un recurso y retira su archivo físico si existe. */
@Injectable()
export class DeleteStoryAssetUseCase {
  constructor(
    private readonly repository: FilesRepository,
    private readonly storage: LocalFileStorageService,
    private readonly auditService: AuditService,
  ) {}

  async execute(id: string, actorUserId: string, context: RequestContext): Promise<void> {
    const current = await this.repository.findStoryAssetById(id);

    if (!current) throw AppException.notFound(FileMessages.NotFound);

    const deleted = await this.repository.softDeleteStoryAsset(id);
    await this.storage.remove(deleted.storagePath);

    await this.auditService.record({
      actorUserId,
      action: AuditAction.StoryAssetDeleted,
      entityType: AuditEntityType.StoryAsset,
      entityId: id,
      summary: 'Se eliminó un recurso de historia.',
      metadata: { storyId: current.storyId, type: current.type },
      context,
    });
  }
}
