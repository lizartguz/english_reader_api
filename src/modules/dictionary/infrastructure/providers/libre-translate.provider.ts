import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { SystemLogSource } from '@/common/constants/system-log-sources.constants';
import { SystemLogWriterService } from '@/modules/system-logs/application/system-log-writer.service';
import type { TranslationCandidate } from '../../domain/dictionary-provider.types';

interface LibreTranslateResponse {
  translatedText?: string;
}

/** Adaptador de LibreTranslate usado para enriquecer el caché con español. */
@Injectable()
export class LibreTranslateProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(
    configService: ConfigService,
    private readonly systemLogWriter: SystemLogWriterService,
  ) {
    this.baseUrl = configService.get<string>('external.translationUrl') as string;
    this.apiKey = configService.get<string>('external.translationApiKey') ?? '';
    this.timeoutMs = configService.get<number>('external.timeoutMs') ?? 8000;
  }

  async translateWord(
    word: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<TranslationCandidate | null> {
    try {
      const response = await axios.post<LibreTranslateResponse>(
        `${this.baseUrl.replace(/\/$/, '')}/translate`,
        {
          q: word,
          source: sourceLanguage,
          target: targetLanguage,
          format: 'text',
          ...(this.apiKey ? { api_key: this.apiKey } : {}),
        },
        { timeout: this.timeoutMs },
      );

      const translated = response.data.translatedText?.trim();
      if (!translated) return null;

      return {
        targetLanguage,
        translation: translated.slice(0, 255),
        source: 'libretranslate',
      };
    } catch (error) {
      // La traducción no bloquea el caché: Flutter puede mostrar definición y fonética.
      await this.systemLogWriter.writeProviderFailure(
        SystemLogSource.TranslationProvider,
        'Falló la consulta al proveedor de traducción.',
        this.buildFailureMetadata(error, word, targetLanguage),
      );

      return null;
    }
  }

  private buildFailureMetadata(error: unknown, word: string, targetLanguage: string) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        provider: 'libretranslate',
        word,
        targetLanguage,
        status: axiosError.response?.status,
        code: axiosError.code,
      };
    }

    return { provider: 'libretranslate', word, targetLanguage };
  }
}
