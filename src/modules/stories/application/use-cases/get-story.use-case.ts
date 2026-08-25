import { Injectable } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { StoryMessages } from '@/common/constants/messages.constants';
import { toStoryDetail } from '@/modules/stories/domain/story-mapper';
import { StoriesRepository } from '../../infrastructure/persistence/stories.repository';

/** Obtiene una historia por identificador, con su contenido completo. */
@Injectable()
export class GetStoryUseCase {
  constructor(private readonly repository: StoriesRepository) {}

  async execute(id: string) {
    const story = await this.repository.findById(id);

    if (!story) throw AppException.notFound(StoryMessages.NotFound);

    return toStoryDetail(story);
  }
}
