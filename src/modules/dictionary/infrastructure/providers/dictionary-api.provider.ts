import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { DictionaryMessages } from '@/common/constants/messages.constants';
import { SystemLogSource } from '@/common/constants/system-log-sources.constants';
import { PartOfSpeech } from '@/common/enums/domain.enums';
import { AppException } from '@/common/exceptions/app.exception';
import { SystemLogWriterService } from '@/modules/system-logs/application/system-log-writer.service';
import type { DictionaryLookupCandidate } from '../../domain/dictionary-provider.types';

interface DictionaryApiPhonetic {
  text?: string;
  audio?: string;
}

interface DictionaryApiDefinition {
  definition?: string;
  example?: string;
}

interface DictionaryApiMeaning {
  partOfSpeech?: string;
  definitions?: DictionaryApiDefinition[];
}

interface DictionaryApiEntry {
  word?: string;
  phonetic?: string;
  phonetics?: DictionaryApiPhonetic[];
  meanings?: DictionaryApiMeaning[];
}

/** Adaptador de dictionaryapi.dev para mantener la API aislada del proveedor. */
@Injectable()
export class DictionaryApiProvider {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    configService: ConfigService,
    private readonly systemLogWriter: SystemLogWriterService,
  ) {
    this.baseUrl = configService.get<string>('external.dictionaryUrl') as string;
    this.timeoutMs = configService.get<number>('external.timeoutMs') ?? 8000;
  }

  async lookup(
    normalizedWord: string,
    language: string,
  ): Promise<DictionaryLookupCandidate | null> {
    try {
      const response = await axios.get<DictionaryApiEntry[]>(
        `${this.baseUrl.replace(/\/$/, '')}/${encodeURIComponent(normalizedWord)}`,
        { timeout: this.timeoutMs },
      );

      const entry = response.data[0];
      if (!entry) return null;

      return this.toCandidate(entry, normalizedWord, language);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;

      await this.systemLogWriter.writeProviderFailure(
        SystemLogSource.DictionaryProvider,
        'Falló la consulta al proveedor de diccionario.',
        this.buildFailureMetadata(error, normalizedWord),
      );

      throw AppException.externalUnavailable(DictionaryMessages.ProviderUnavailable);
    }
  }

  private toCandidate(
    entry: DictionaryApiEntry,
    normalizedWord: string,
    language: string,
  ): DictionaryLookupCandidate {
    const meanings = entry.meanings ?? [];
    const firstMeaning = meanings.find((meaning) => (meaning.definitions ?? []).length > 0);
    const firstDefinition = firstMeaning?.definitions?.find((item) => item.definition);
    const examples = meanings
      .flatMap((meaning) => meaning.definitions ?? [])
      .map((definition) => definition.example?.trim())
      .filter((example): example is string => Boolean(example))
      .filter((example, index, all) => all.indexOf(example) === index)
      .slice(0, 5);

    const pronunciations = (entry.phonetics ?? [])
      .filter((phonetic) => phonetic.text || phonetic.audio)
      .map((phonetic) => ({
        accent: null,
        phonetic: phonetic.text?.trim() ?? null,
        audioUrl: phonetic.audio?.trim() || null,
        source: 'dictionaryapi.dev',
      }))
      .slice(0, 5);

    return {
      word: entry.word?.trim() || normalizedWord,
      normalizedWord,
      language,
      phonetic: entry.phonetic?.trim() || pronunciations[0]?.phonetic || null,
      definitionEn: firstDefinition?.definition?.trim() ?? null,
      partOfSpeech: this.mapPartOfSpeech(firstMeaning?.partOfSpeech),
      source: 'dictionaryapi.dev',
      examples: examples.map((exampleText) => ({ exampleText, source: 'dictionaryapi.dev' })),
      pronunciations,
    };
  }

  private mapPartOfSpeech(value: string | undefined): PartOfSpeech {
    const normalized = (value ?? '').toLowerCase();

    if (normalized.includes('noun')) return PartOfSpeech.noun;
    if (normalized.includes('verb')) return PartOfSpeech.verb;
    if (normalized.includes('adjective')) return PartOfSpeech.adjective;
    if (normalized.includes('adverb')) return PartOfSpeech.adverb;
    if (normalized.includes('pronoun')) return PartOfSpeech.pronoun;
    if (normalized.includes('preposition')) return PartOfSpeech.preposition;
    if (normalized.includes('conjunction')) return PartOfSpeech.conjunction;
    if (normalized.includes('interjection')) return PartOfSpeech.interjection;
    if (normalized.includes('determiner')) return PartOfSpeech.determiner;
    if (normalized.includes('numeral')) return PartOfSpeech.numeral;
    if (normalized.includes('article')) return PartOfSpeech.article;
    if (normalized.includes('phrase')) return PartOfSpeech.phrase;

    return PartOfSpeech.other;
  }

  private buildFailureMetadata(error: unknown, word: string) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        provider: 'dictionaryapi.dev',
        word,
        status: axiosError.response?.status,
        code: axiosError.code,
      };
    }

    return { provider: 'dictionaryapi.dev', word };
  }
}
