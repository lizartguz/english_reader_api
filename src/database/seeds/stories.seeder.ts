import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { StoryStatus } from '@/common/enums/domain.enums';
import { buildSlug } from '@/common/utils/slug.util';

/**
 * Historias iniciales de prueba.
 *
 * Se cargan solo con texto y metadatos mínimos: la planificación indica que no
 * deben crearse recursos en `story_assets` para estas historias.
 */
const SEED_STORIES = [
  {
    title: 'The Red Umbrella',
    levelCode: 'A1',
    status: StoryStatus.published,
    estimatedReadingMinutes: 3,
    sortOrder: 1,
    summary: 'Una historia corta sobre un paraguas rojo que cambia el día de una niña.',
    content: [
      'Mia walks to school every morning. Today the sky is grey and the wind is cold.',
      '',
      'On the corner she sees a red umbrella. It is open and it is alone. Nobody is under it.',
      '',
      '"Whose umbrella is this?" she asks. Nobody answers.',
      '',
      'Mia takes the umbrella and walks to school. The rain starts, but she is dry and happy.',
      '',
      'At school, a boy looks at the umbrella and smiles. "That is my umbrella," he says. "The wind took it."',
      '',
      'Mia gives him the umbrella. He looks at the rain, then at Mia.',
      '',
      '"We can share it," he says. And they walk home together under the red umbrella.',
    ].join('\n'),
  },
  {
    title: 'A Letter From the Lighthouse',
    levelCode: 'A2',
    status: StoryStatus.draft,
    estimatedReadingMinutes: 5,
    sortOrder: 2,
    summary: 'Un pescador encuentra una carta antigua dentro de una botella.',
    content: [
      'Every evening, Tom walked along the beach and looked at the old lighthouse.',
      'It had been dark for many years, but he still liked to watch it.',
      '',
      'One evening he found a green bottle in the sand. Inside there was a letter.',
      'The paper was yellow and the words were small, but he could read them.',
      '',
      '"If you find this letter, please visit the lighthouse. I left something there for you."',
      '',
      'Tom did not know who had written the letter. The date said 1961.',
      'He was curious, so the next morning he climbed the hill and opened the heavy door.',
      '',
      'Inside, on a wooden table, there was a small box with a photograph of the sea.',
      'On the back, someone had written: "The best view in the world. Take care of it."',
      '',
      'Tom smiled. He put the photograph in his pocket and looked out at the water.',
      'From that day, he cleaned the lighthouse every week, and the light shone again.',
    ].join('\n'),
  },
] as const;

/** Crea las historias de prueba iniciales. Es idempotente por `slug`. */
@Injectable()
export class StoriesSeeder {
  private readonly logger = new Logger(StoriesSeeder.name);

  constructor(private readonly prisma: PrismaService) {}

  async run(): Promise<void> {
    for (const story of SEED_STORIES) {
      const level = await this.prisma.readingLevel.findUnique({
        where: { code: story.levelCode },
        select: { id: true },
      });

      if (!level) {
        this.logger.warn(`No existe el nivel ${story.levelCode}: se omite "${story.title}".`);
        continue;
      }

      const slug = buildSlug(story.title);

      await this.prisma.story.upsert({
        where: { slug },
        // Al volver a sembrar no se sobrescribe contenido que un administrador
        // pudo haber editado; solo se garantiza que la historia exista.
        update: {},
        create: {
          title: story.title,
          slug,
          summary: story.summary,
          content: story.content,
          status: story.status,
          estimatedReadingMinutes: story.estimatedReadingMinutes,
          sortOrder: story.sortOrder,
          readingLevelId: level.id,
          publishedAt: story.status === StoryStatus.published ? new Date() : null,
        },
      });
    }

    this.logger.log(`Historias semilla sincronizadas: ${SEED_STORIES.length}.`);
  }
}
