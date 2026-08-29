import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { DictionaryMessages } from '@/common/constants/messages.constants';
import { SystemLogSource } from '@/common/constants/system-log-sources.constants';
import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/database/prisma.service';
import { LocalFileStorageService } from '@/modules/files/infrastructure/storage/local-file-storage.service';
import { SystemLogWriterService } from '@/modules/system-logs/application/system-log-writer.service';

/** Audio de pronunciación listo para entregarse al cliente. */
export interface PronunciationAudio {
  buffer: Buffer;
  mimeType: string;
}

/**
 * Entrega el audio de una pronunciación desde esta API.
 *
 * La app no descarga el audio del proveedor externo: lo pide aquí. Así el
 * navegador o el dispositivo del lector nunca contacta a un tercero, que de
 * otro modo conocería su dirección IP y qué palabra está consultando.
 *
 * El origen se valida igualmente antes de descargar: la URL la guardó un
 * proveedor externo y no debe poder apuntar a cualquier host.
 */
@Injectable()
export class GetPronunciationAudioUseCase {
  private readonly timeoutMs: number;
  private readonly maxBytes: number;
  private readonly allowedHosts: string[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalFileStorageService,
    private readonly systemLogWriter: SystemLogWriterService,
    configService: ConfigService,
  ) {
    this.timeoutMs = configService.get<number>('external.pronunciationAudioTimeoutMs') ?? 20000;
    this.maxBytes = configService.get<number>('external.maxPronunciationAudioBytes') ?? 5242880;

    const configured = configService.get<string[]>('external.pronunciationAudioHosts') ?? [];
    // Sin lista explícita se usa el host del propio proveedor de diccionario,
    // que es de donde salen las URLs hoy.
    this.allowedHosts = configured.length > 0 ? configured : [this.dictionaryHost(configService)];
  }

  async execute(pronunciationId: string): Promise<PronunciationAudio> {
    const pronunciation = await this.prisma.wordPronunciation.findUnique({
      where: { id: pronunciationId },
      select: {
        audioUrl: true,
        audioStoragePath: true,
        audioMimeType: true,
      },
    });

    if (!pronunciation?.audioUrl) {
      throw AppException.notFound(DictionaryMessages.AudioNotFound);
    }

    // Si otro usuario ya reprodujo esta pronunciación, el audio está en disco:
    // se sirve desde aquí sin volver a salir al proveedor.
    const enCache = await this.leerDeCache(pronunciation);
    if (enCache) return enCache;

    const url = this.assertAllowedUrl(pronunciation.audioUrl);

    try {
      const response = await axios.get<ArrayBuffer>(url.toString(), {
        responseType: 'arraybuffer',
        timeout: this.timeoutMs,
        maxContentLength: this.maxBytes,
        maxRedirects: 0, // Una redirección podría sacarnos de la lista permitida.
      });

      const mimeType = String(response.headers['content-type'] ?? '')
        .split(';')[0]
        .trim();
      if (!mimeType.startsWith('audio/')) {
        throw AppException.businessRule(DictionaryMessages.AudioUnavailable);
      }

      const buffer = Buffer.from(response.data);
      await this.guardarEnCache(pronunciationId, buffer, mimeType);

      return { buffer, mimeType };
    } catch (error) {
      if (error instanceof AppException) throw error;

      await this.systemLogWriter.writeProviderFailure(
        SystemLogSource.DictionaryProvider,
        'No se pudo descargar el audio de pronunciación.',
        { pronunciationId, host: url.host },
      );

      throw AppException.businessRule(DictionaryMessages.AudioUnavailable);
    }
  }

  /** Devuelve la copia local si sigue existiendo en disco. */
  private async leerDeCache(pronunciation: {
    audioStoragePath: string | null;
    audioMimeType: string | null;
  }): Promise<PronunciationAudio | null> {
    const { audioStoragePath, audioMimeType } = pronunciation;
    if (!audioStoragePath || !audioMimeType) return null;

    try {
      return { buffer: await this.storage.read(audioStoragePath), mimeType: audioMimeType };
    } catch {
      // El archivo pudo borrarse del disco: se vuelve a descargar.
      return null;
    }
  }

  /**
   * Guarda la copia local para las próximas reproducciones.
   *
   * Un fallo aquí no debe romper la reproducción actual: el audio ya se
   * descargó y el usuario lo va a escuchar igual, solo se pierde la caché.
   */
  private async guardarEnCache(
    pronunciationId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<void> {
    const storagePath = `pronunciations/${pronunciationId}.audio`;

    try {
      await this.storage.storeBytes(storagePath, buffer);
      await this.prisma.wordPronunciation.update({
        where: { id: pronunciationId },
        data: { audioStoragePath: storagePath, audioMimeType: mimeType, audioCachedAt: new Date() },
      });
    } catch {
      // Se ignora a propósito: la respuesta actual ya está resuelta.
    }
  }

  /** Rechaza esquemas que no sean HTTPS y hosts fuera de la lista permitida. */
  private assertAllowedUrl(rawUrl: string): URL {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw AppException.notFound(DictionaryMessages.AudioNotFound);
    }

    const hostPermitido = this.allowedHosts.includes(url.hostname.toLowerCase());
    if (url.protocol !== 'https:' || !hostPermitido) {
      throw AppException.notFound(DictionaryMessages.AudioNotFound);
    }

    return url;
  }

  private dictionaryHost(configService: ConfigService): string {
    const dictionaryUrl = configService.get<string>('external.dictionaryUrl') ?? '';
    try {
      return new URL(dictionaryUrl).hostname.toLowerCase();
    } catch {
      return '';
    }
  }
}
