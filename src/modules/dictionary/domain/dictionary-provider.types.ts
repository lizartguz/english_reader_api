import { PartOfSpeech } from '@/common/enums/domain.enums';

/** Pronunciación obtenida desde un proveedor externo. */
export interface DictionaryPronunciationCandidate {
  accent?: string | null;
  phonetic?: string | null;
  audioUrl?: string | null;
  source?: string | null;
}

/** Ejemplo de uso obtenido desde un proveedor externo. */
export interface DictionaryExampleCandidate {
  exampleText: string;
  source?: string | null;
}

/** Traducción candidata para guardar en caché local. */
export interface TranslationCandidate {
  targetLanguage: string;
  translation: string;
  meaningContext?: string | null;
  source?: string | null;
}

/** Resultado normalizado del adaptador de diccionario. */
export interface DictionaryLookupCandidate {
  word: string;
  normalizedWord: string;
  language: string;
  phonetic?: string | null;
  definitionEn?: string | null;
  partOfSpeech?: PartOfSpeech | null;
  source?: string | null;
  examples: DictionaryExampleCandidate[];
  pronunciations: DictionaryPronunciationCandidate[];
}
