import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
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

interface DetectedRawFile {
  mimeType: string;
  extension: string;
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
    this.assertSize(file, this.maxImageSizeBytes);

    try {
      const image = sharp(file.buffer, { failOn: 'error' });
      const metadata = await image.metadata();

      if (!this.allowedImageFormats().includes(metadata.format ?? '')) {
        throw new Error('Formato de imagen no permitido.');
      }

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
          originalFormat: metadata.format,
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
    this.assertSize(file, maxBytes);

    const detected = this.detectRawFile(file);

    if (!allowedMimeTypes.includes(detected.mimeType)) {
      throw AppException.validation(FileMessages.UnsupportedType);
    }

    if (!this.declaredMimeMatchesDetected(file.mimetype, detected.mimeType)) {
      throw AppException.validation(FileMessages.UnsupportedType);
    }

    const storagePath = this.buildStoragePath(storyId, detected.extension);

    await this.write(storagePath, file.buffer);

    return {
      storageDisk: 'local',
      storagePath,
      mimeType: detected.mimeType,
      fileSizeBytes: file.size,
      metadata: {
        originalMimeType: file.mimetype,
        detectedMimeType: detected.mimeType,
        optimized: false,
      },
    };
  }

  private assertFilePresent(file: MemoryUploadFile | undefined): asserts file is MemoryUploadFile {
    if (!file?.buffer || file.size <= 0) throw AppException.validation(FileMessages.Required);
  }

  private assertSize(file: MemoryUploadFile, maxBytes: number): void {
    if (file.size > maxBytes) throw AppException.validation(FileMessages.TooLarge);
  }

  private async write(storagePath: string, buffer: Buffer): Promise<void> {
    const absolute = this.resolveStoragePath(storagePath);
    await mkdir(resolve(absolute, '..'), { recursive: true });
    await writeFile(absolute, buffer);
  }

  private buildStoragePath(storyId: string, extension: string): string {
    return `story-assets/${storyId}/${randomUUID()}.${extension}`;
  }

  private resolveStoragePath(storagePath: string): string {
    const absolute = resolve(join(this.privatePath, storagePath));
    const distance = relative(this.privatePath, absolute);

    if (distance === '..' || distance.startsWith(`..${sep}`) || isAbsolute(distance)) {
      throw AppException.validation(FileMessages.NotFound);
    }

    return absolute;
  }

  private detectRawFile(file: MemoryUploadFile): DetectedRawFile {
    if (this.isPdf(file.buffer)) return { mimeType: 'application/pdf', extension: 'pdf' };
    if (this.isMp3(file.buffer)) return { mimeType: 'audio/mpeg', extension: 'mp3' };
    if (this.isMp4Audio(file.buffer)) return { mimeType: 'audio/mp4', extension: 'm4a' };
    if (this.isPlainText(file.buffer)) return { mimeType: 'text/plain', extension: 'txt' };

    throw AppException.validation(FileMessages.UnsupportedType);
  }

  private isPdf(buffer: Buffer): boolean {
    return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  }

  private isMp3(buffer: Buffer): boolean {
    if (buffer.subarray(0, 3).toString('ascii') === 'ID3') return true;

    const first = buffer[0];
    const second = buffer[1];

    return first === 0xff && [0xe2, 0xe3, 0xf2, 0xf3, 0xfa, 0xfb].includes(second);
  }

  private isMp4Audio(buffer: Buffer): boolean {
    if (buffer.length < 12) return false;

    const box = buffer.subarray(4, 8).toString('ascii');
    const brand = buffer.subarray(8, 12).toString('ascii');

    return box === 'ftyp' && ['M4A ', 'M4B ', 'mp42', 'isom', 'iso2'].includes(brand);
  }

  private isPlainText(buffer: Buffer): boolean {
    if (buffer.includes(0)) return false;

    const text = buffer.toString('utf8');
    if (text.includes('\uFFFD')) return false;

    const controlBytes = [...buffer].filter(
      (byte) => byte < 32 && byte !== 9 && byte !== 10 && byte !== 13,
    ).length;

    return controlBytes / buffer.length <= 0.02;
  }

  private declaredMimeMatchesDetected(declaredMimeType: string, detectedMimeType: string): boolean {
    const declared = declaredMimeType.toLowerCase();

    if (detectedMimeType === 'audio/mp4') {
      return ['audio/mp4', 'audio/m4a', 'audio/x-m4a'].includes(declared);
    }

    return declared === detectedMimeType;
  }

  private allowedImageFormats(): readonly string[] {
    return ['png', 'jpeg', 'webp'];
  }

  private allowedAudioMimeTypes(): readonly string[] {
    return ['audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/x-m4a'];
  }

  private allowedAttachmentMimeTypes(): readonly string[] {
    return ['application/pdf', 'text/plain'];
  }
}
