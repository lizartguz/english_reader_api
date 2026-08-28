import { Injectable } from '@nestjs/common';
import { ReadingProgressMessages, StoryMessages } from '@/common/constants/messages.constants';
import { AppException } from '@/common/exceptions/app.exception';
import { StoriesRepository } from '@/modules/stories/infrastructure/persistence/stories.repository';
import { toReadingProgressResponse } from '../../domain/reading-progress.mapper';
import { ReadingProgressRepository } from '../../infrastructure/persistence/reading-progress.repository';
import type { UpdateReadingProgressDto } from '../dto';

/** Obtiene el avance guardado por el cliente para una historia publicada. */
@Injectable()
export class GetReadingProgressUseCase {
  constructor(
    private readonly repository: ReadingProgressRepository,
    private readonly storiesRepository: StoriesRepository,
  ) {}

  async execute(userId: string, storyId: string) {
    const story = await this.storiesRepository.findPublishedById(storyId);

    if (!story) throw AppException.notFound(StoryMessages.NotAvailable);

    const progress = await this.repository.findByUserAndStory(userId, storyId);

    if (!progress) throw AppException.notFound(ReadingProgressMessages.NotFound);

    return toReadingProgressResponse(progress);
  }
}

/** Lista el avance guardado por el cliente en historias publicadas. */
@Injectable()
export class ListReadingProgressUseCase {
  constructor(private readonly repository: ReadingProgressRepository) {}

  async execute(userId: string) {
    const items = await this.repository.listByUser(userId);

    return items.map(toReadingProgressResponse);
  }
}

/** Crea o actualiza parcialmente el avance de lectura del cliente. */
@Injectable()
export class SaveReadingProgressUseCase {
  constructor(
    private readonly repository: ReadingProgressRepository,
    private readonly storiesRepository: StoriesRepository,
  ) {}

  async execute(userId: string, storyId: string, dto: UpdateReadingProgressDto) {
    const story = await this.storiesRepository.findPublishedById(storyId);

    if (!story) throw AppException.notFound(StoryMessages.NotAvailable);

    const progressPercent = this.resolveProgressPercent(dto);
    const completedAt = this.resolveCompletedAt(dto, progressPercent);

    const saved = await this.repository.upsert({
      userId,
      storyId,
      ...(progressPercent !== undefined ? { progressPercent } : {}),
      ...(dto.lastPosition !== undefined ? { lastPosition: dto.lastPosition } : {}),
      ...(completedAt !== undefined ? { completedAt } : {}),
      lastReadAt: new Date(),
    });

    return toReadingProgressResponse(saved);
  }

  private resolveProgressPercent(dto: UpdateReadingProgressDto): number | undefined {
    if (dto.completed === true) return 100;
    return dto.progressPercent;
  }

  private resolveCompletedAt(
    dto: UpdateReadingProgressDto,
    progressPercent: number | undefined,
  ): Date | null | undefined {
    if (dto.completed === true || progressPercent === 100) return new Date();
    if (dto.completed === false || (progressPercent !== undefined && progressPercent < 100))
      return null;
    return undefined;
  }
}
