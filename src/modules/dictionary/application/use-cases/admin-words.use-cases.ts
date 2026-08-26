import { Injectable } from '@nestjs/common';
import { DictionaryMessages } from '@/common/constants/messages.constants';
import { AuditAction, AuditEntityType } from '@/common/constants/audit-actions.constants';
import { AppException } from '@/common/exceptions/app.exception';
import { buildPaginationMeta, normalizePagination } from '@/common/utils/pagination.util';
import { isLookupableWord, normalizeWord } from '@/common/utils/word-normalizer.util';
import type { RequestContext } from '@/common/utils/request-context.util';
import { AuditService } from '@/modules/audit/application/audit.service';
import {
  toTranslationListItem,
  toWordListItem,
  toWordLookupResponse,
  toWordTranslationAdminResponse,
} from '../../domain/word-entry.mapper';
import {
  DictionaryRepository,
  type CreateWordManualInput,
} from '../../infrastructure/persistence/dictionary.repository';
import type {
  AdminWordQueryDto,
  CreateTranslationDto,
  CreateWordDto,
  ReviewTranslationDto,
  ReviewWordDto,
  TranslationQueryDto,
  UpdateTranslationDto,
  UpdateWordDto,
} from '../dto';

/** Lista palabras del diccionario para el panel administrativo. */
@Injectable()
export class ListAdminWordsUseCase {
  constructor(private readonly repository: DictionaryRepository) {}

  async execute(query: AdminWordQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query.page, query.limit);
    const { items, total } = await this.repository.list(
      {
        search: query.search,
        language: query.language,
        reviewStatus: query.reviewStatus,
        partOfSpeech: query.partOfSpeech,
        source: query.source,
      },
      { skip, take },
      { field: query.sort, order: query.order },
    );

    return { items: items.map(toWordListItem), meta: buildPaginationMeta(total, page, limit) };
  }
}

/** Obtiene el detalle administrativo de una palabra. */
@Injectable()
export class GetAdminWordUseCase {
  constructor(private readonly repository: DictionaryRepository) {}

  async execute(id: string) {
    const word = await this.repository.findById(id);

    if (!word) throw AppException.notFound(DictionaryMessages.WordNotFound);

    return toWordLookupResponse(word);
  }
}

/** Crea una palabra revisada manualmente desde administración. */
@Injectable()
export class CreateAdminWordUseCase {
  constructor(
    private readonly repository: DictionaryRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(dto: CreateWordDto, actorUserId: string, context: RequestContext) {
    const input = this.buildWordInput(dto, actorUserId);
    const existing = await this.repository.findAnyByNormalized(
      input.normalizedWord,
      input.language,
    );

    if (existing) {
      throw AppException.conflict(DictionaryMessages.WordAlreadyExists, [
        { field: 'word', message: DictionaryMessages.WordAlreadyExists },
      ]);
    }

    const created = await this.repository.createManual(input);

    await this.auditService.record({
      actorUserId,
      action: AuditAction.WordCreated,
      entityType: AuditEntityType.WordEntry,
      entityId: created.id,
      summary: `Se creó la palabra "${created.word}".`,
      context,
    });

    return toWordLookupResponse(created);
  }

  private buildWordInput(dto: CreateWordDto, actorUserId: string): CreateWordManualInput {
    const normalizedWord = normalizeWord(dto.word);

    if (!isLookupableWord(normalizedWord)) {
      throw AppException.validation(DictionaryMessages.InvalidWord, [
        { field: 'word', message: DictionaryMessages.InvalidWord },
      ]);
    }

    return {
      word: dto.word,
      normalizedWord,
      language: dto.language ?? 'en',
      phonetic: dto.phonetic ?? null,
      definitionEn: dto.definitionEn ?? null,
      partOfSpeech: dto.partOfSpeech ?? null,
      source: dto.source ?? 'admin',
      reviewedByUserId: actorUserId,
      examples: dto.examples ?? [],
      pronunciations: dto.pronunciations ?? [],
      translations: (dto.translations ?? []).map((translation) => ({
        targetLanguage: translation.targetLanguage ?? 'es',
        translation: translation.translation,
        meaningContext: translation.meaningContext ?? null,
        source: translation.source ?? 'admin',
      })),
    };
  }
}

/** Actualiza los datos base de una palabra del diccionario. */
@Injectable()
export class UpdateAdminWordUseCase {
  constructor(
    private readonly repository: DictionaryRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(id: string, dto: UpdateWordDto, actorUserId: string, context: RequestContext) {
    const current = await this.repository.findById(id);

    if (!current) throw AppException.notFound(DictionaryMessages.WordNotFound);

    const word = dto.word ?? current.word;
    const language = dto.language ?? current.language;
    const normalizedWord =
      dto.word !== undefined ? normalizeWord(dto.word) : current.normalizedWord;

    if (!isLookupableWord(normalizedWord)) {
      throw AppException.validation(DictionaryMessages.InvalidWord, [
        { field: 'word', message: DictionaryMessages.InvalidWord },
      ]);
    }

    if (normalizedWord !== current.normalizedWord || language !== current.language) {
      const existing = await this.repository.findAnyByNormalized(normalizedWord, language);

      if (existing && existing.id !== id) {
        throw AppException.conflict(DictionaryMessages.WordAlreadyExists, [
          { field: 'word', message: DictionaryMessages.WordAlreadyExists },
        ]);
      }
    }

    const updated = await this.repository.updateWord(id, {
      ...(dto.word !== undefined ? { word, normalizedWord } : {}),
      ...(dto.language !== undefined ? { language } : {}),
      ...(dto.phonetic !== undefined ? { phonetic: dto.phonetic } : {}),
      ...(dto.definitionEn !== undefined ? { definitionEn: dto.definitionEn } : {}),
      ...(dto.partOfSpeech !== undefined ? { partOfSpeech: dto.partOfSpeech } : {}),
      ...(dto.source !== undefined ? { source: dto.source } : {}),
      reviewedByUserId: actorUserId,
      reviewedAt: new Date(),
    });

    await this.auditService.record({
      actorUserId,
      action: AuditAction.WordUpdated,
      entityType: AuditEntityType.WordEntry,
      entityId: id,
      summary: `Se actualizó la palabra "${updated.word}".`,
      context,
    });

    return toWordLookupResponse(updated);
  }
}

/** Registra la revisión administrativa de una palabra. */
@Injectable()
export class ReviewAdminWordUseCase {
  constructor(
    private readonly repository: DictionaryRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(id: string, dto: ReviewWordDto, actorUserId: string, context: RequestContext) {
    const current = await this.repository.findById(id);

    if (!current) throw AppException.notFound(DictionaryMessages.WordNotFound);

    const updated = await this.repository.reviewWord(id, dto.reviewStatus, actorUserId);

    await this.auditService.record({
      actorUserId,
      action: AuditAction.WordReviewed,
      entityType: AuditEntityType.WordEntry,
      entityId: id,
      summary: `Se revisó la palabra "${updated.word}" como "${dto.reviewStatus}".`,
      metadata: { from: current.reviewStatus, to: dto.reviewStatus },
      context,
    });

    return toWordLookupResponse(updated);
  }
}

/** Elimina lógicamente una palabra del diccionario. */
@Injectable()
export class DeleteAdminWordUseCase {
  constructor(
    private readonly repository: DictionaryRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(id: string, actorUserId: string, context: RequestContext): Promise<void> {
    const current = await this.repository.findById(id);

    if (!current) throw AppException.notFound(DictionaryMessages.WordNotFound);

    await this.repository.softDeleteWord(id);

    await this.auditService.record({
      actorUserId,
      action: AuditAction.WordDeleted,
      entityType: AuditEntityType.WordEntry,
      entityId: id,
      summary: `Se eliminó la palabra "${current.word}".`,
      context,
    });
  }
}

/** Lista traducciones administrativas de todas las palabras, con filtros propios. */
@Injectable()
export class ListTranslationsUseCase {
  constructor(private readonly repository: DictionaryRepository) {}

  async execute(query: TranslationQueryDto) {
    const { page, limit, skip, take } = normalizePagination(query.page, query.limit);
    const { items, total } = await this.repository.listTranslations(
      {
        word: query.word,
        targetLanguage: query.targetLanguage,
        reviewStatus: query.reviewStatus,
        source: query.source,
      },
      { skip, take },
      { field: query.sort, order: query.order },
    );

    return {
      items: items.map(toTranslationListItem),
      meta: buildPaginationMeta(total, page, limit),
    };
  }
}

/** Lista traducciones vigentes asociadas a una palabra. */
@Injectable()
export class ListWordTranslationsUseCase {
  constructor(private readonly repository: DictionaryRepository) {}

  async execute(wordEntryId: string, query: { page?: number; limit?: number }) {
    const word = await this.repository.findById(wordEntryId);

    if (!word) throw AppException.notFound(DictionaryMessages.WordNotFound);

    const { page, limit, skip, take } = normalizePagination(query.page, query.limit);
    const { items, total } = await this.repository.listTranslationsByWord(wordEntryId, {
      skip,
      take,
    });

    return {
      items: items.map(toWordTranslationAdminResponse),
      meta: buildPaginationMeta(total, page, limit),
    };
  }
}

/** Crea una traducción manual para una palabra existente. */
@Injectable()
export class CreateWordTranslationUseCase {
  constructor(
    private readonly repository: DictionaryRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    wordEntryId: string,
    dto: CreateTranslationDto,
    actorUserId: string,
    context: RequestContext,
  ) {
    const word = await this.repository.findById(wordEntryId);

    if (!word) throw AppException.notFound(DictionaryMessages.WordNotFound);

    const created = await this.repository.createTranslation(wordEntryId, {
      targetLanguage: dto.targetLanguage ?? 'es',
      translation: dto.translation,
      meaningContext: dto.meaningContext ?? null,
      source: dto.source ?? 'admin',
    });

    await this.auditService.record({
      actorUserId,
      action: AuditAction.TranslationCreated,
      entityType: AuditEntityType.WordTranslation,
      entityId: created.id,
      summary: `Se creó una traducción para "${word.word}".`,
      context,
    });

    return toWordTranslationAdminResponse(created);
  }
}

/** Actualiza una traducción existente. */
@Injectable()
export class UpdateWordTranslationUseCase {
  constructor(
    private readonly repository: DictionaryRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    id: string,
    dto: UpdateTranslationDto,
    actorUserId: string,
    context: RequestContext,
  ) {
    const current = await this.repository.findTranslationById(id);

    if (!current) throw AppException.notFound(DictionaryMessages.TranslationNotFound);

    const updated = await this.repository.updateTranslation(id, {
      ...(dto.targetLanguage !== undefined ? { targetLanguage: dto.targetLanguage } : {}),
      ...(dto.translation !== undefined ? { translation: dto.translation } : {}),
      ...(dto.meaningContext !== undefined ? { meaningContext: dto.meaningContext } : {}),
      ...(dto.source !== undefined ? { source: dto.source } : {}),
    });

    await this.auditService.record({
      actorUserId,
      action: AuditAction.TranslationUpdated,
      entityType: AuditEntityType.WordTranslation,
      entityId: id,
      summary: 'Se actualizó una traducción del diccionario.',
      context,
    });

    return toWordTranslationAdminResponse(updated);
  }
}

/** Registra la revisión administrativa de una traducción. */
@Injectable()
export class ReviewWordTranslationUseCase {
  constructor(
    private readonly repository: DictionaryRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    id: string,
    dto: ReviewTranslationDto,
    actorUserId: string,
    context: RequestContext,
  ) {
    const current = await this.repository.findTranslationById(id);

    if (!current) throw AppException.notFound(DictionaryMessages.TranslationNotFound);

    const updated = await this.repository.reviewTranslation(id, dto.reviewStatus, actorUserId);

    await this.auditService.record({
      actorUserId,
      action: AuditAction.TranslationReviewed,
      entityType: AuditEntityType.WordTranslation,
      entityId: id,
      summary: `Se revisó una traducción como "${dto.reviewStatus}".`,
      metadata: { from: current.reviewStatus, to: dto.reviewStatus },
      context,
    });

    return toWordTranslationAdminResponse(updated);
  }
}

/** Elimina lógicamente una traducción. */
@Injectable()
export class DeleteWordTranslationUseCase {
  constructor(
    private readonly repository: DictionaryRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(id: string, actorUserId: string, context: RequestContext): Promise<void> {
    const current = await this.repository.findTranslationById(id);

    if (!current) throw AppException.notFound(DictionaryMessages.TranslationNotFound);

    await this.repository.softDeleteTranslation(id);

    await this.auditService.record({
      actorUserId,
      action: AuditAction.TranslationDeleted,
      entityType: AuditEntityType.WordTranslation,
      entityId: id,
      summary: 'Se eliminó una traducción del diccionario.',
      context,
    });
  }
}
