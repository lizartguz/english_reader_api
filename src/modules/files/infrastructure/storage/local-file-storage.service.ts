import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { StoryAssetType } from '@/common/enums/domain.enums';
import { AppException } from '@/common/exceptions/app.exception';
import { FileMessages } from '@/common/constants/messages.constants';

/** Resultado de almacenar un archivo procesado en el disco local privado. */
export interface StoredFile {
  storageDisk: string;
  storagePath: string;
  mimeType: string;
  fileSizeBytes: number;
  metadata: Record<string, unknown>;
}

/** Archivo recibido por Multer en memoria. */
export interface MemoryUploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/** Almacenamiento local privado para recursos de historias. */
@Injectable()
export class LocalFileStorageService {
  private readonly privatePath: string;
  private readonly maxImageSizeBytes: number;
  private readonly maxAudioSizeBytes: number;
  private readonly imageMaxWidth: number;
  private readonly imageWebpQuality: number;

  constructor(configService: ConfigService) {
    this.privatePath = resolve(configService.get<string>('storage.privatePath') as string);
    this.maxImageSizeBytes = configService.get<number>('storage.maxImageSizeBytes') ?? 10 * 1024 * 1024;
    this.maxAudioSizeBytes = configService.get<number>('storage.maxAudioSizeBytes') ?? 15 * 1024 * 1024;
    this.imageMaxWidth = configService.get<number>('storage.imageMaxWidth') ?? 1600;
    this.imageWebpQuality = configService.get<number>('storage.imageWebpQuality') ?? 82;
  }

  async storeStoryAsset(storyId: string, type: StoryAssetType, file: MemoryUploadFile): Promise<StoredFile> {
    this.assertFilePresent(file);

    if (type === StoryAssetType.cover_image) {
      return this.storeImage(storyId, file);
    }

    if (type === StoryAssetType.audio) {
      return this.storeRawFile(storyId, file, this.allowedAudioMimeTypes(), this.maxAudioSizeBytes);
    }

    return this.storeRawFile(storyId, file, this.allowedAttachmentMimeTypes(), this.maxImageSizeBytes);
  }

  async read(storagePath: string): Promise<Buffer> {
    return readFile(this.resolveStoragePath(storagePath));
  }

  async remove(storagePath: string | null): Promise<void> {
    if (!storagePath) return;
    await rm(this.resolveStoragePath(storagePath), { force: true });
  }

  private async storeImage(storyId: string, file: MemoryUploadFile): Promise<StoredFile> {
    this.assertAllowed(file, this.allowedImageMimeTypes(), this.maxImageSizeBytes);

    try {
      const image = sharp(file.buffer, { failOn: 'error' });
      const metadata = await image.metadata();
      const processed = await image
        .resize({ width: this.imageMaxWidth, withoutEnlargement: true })
        .webp({ quality: this.imageWebpQuality })
        .toBuffer();
      const storagePath = this.buildStoragePath(storyId, 'webp');

      await this.write(storagePath, processed);

      return {
        storageDisk: 'local',
        storagePath,
        mimeType: 'image/webp',
        fileSizeBytes: processed.length,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          originalMimeType: file.mimetype,
          optimized: true,
        },
      };
    } catch {
      throw AppException.validation(FileMessages.UnsupportedType);
    }
  }

  private async storeRawFile(
    storyId: string,
    file: MemoryUploadFile,
    allowedMimeTypes: readonly string[],
    maxBytes: number,
  ): Promise<StoredFile> {
    this.assertAllowed(file, allowedMimeTypes, maxBytes);
    const storagePath = this.buildStoragePath(storyId, this.safeExtension(file.originalname));

    await this.write(storagePath, file.buffer);

    return {
      storageDisk: 'local',
      storagePath,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      metadata: { originalMimeType: file.mimetype, optimized: false },
    };
  }

  private assertFilePresent(file: MemoryUploadFile | undefined): asserts file is MemoryUploadFile {
    if (!file?.buffer || file.size <= 0) throw AppException.validation(FileMessages.Required);
  }

  private assertAllowed(file: MemoryUploadFile, allowedMimeTypes: readonly string[], maxBytes: number): void {
    if (file.size > maxBytes) throw AppException.validation(FileMessages.TooLarge);
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw AppException.validation(FileMessages.UnsupportedType);
    }
  }

  private async write(storagePath: string, buffer: Buffer): Promise<void> {
    const absolute = this.resolveStoragePath(storagePath);
    await mkdir(resolve(absolute, '..'), { recursive: true });
    await writeFile(absolute, buffer);
  }

  private buildStoragePath(storyId: string, extension: string): string {
    return `story-assets/${storyId}/${randomUUID()}.${extension}`;
  }

  private safeExtension(fileName: string): string {
    const extension = extname(fileName).replace('.', '').toLowerCase();
    return extension || 'bin';
  }

  private resolveStoragePath(storagePath: string): string {
    const absolute = resolve(join(this.privatePath, storagePath));

    if (!absolute.startsWith(this.privatePath)) {
      throw AppException.validation(FileMessages.NotFound);
    }

    return absolute;
  }

  private allowedImageMimeTypes(): readonly string[] {
    return ['image/png', 'image/jpeg', 'image/webp'];
  }

  private allowedAudioMimeTypes(): readonly string[] {
    return ['audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/x-m4a'];
  }

  private allowedAttachmentMimeTypes(): readonly string[] {
    return ['application/pdf', 'text/plain'];
  }
}
