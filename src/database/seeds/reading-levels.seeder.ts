import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

/** Niveles de lectura iniciales definidos en la planificación. */
const READING_LEVELS = [
  {
    code: 'A1',
    name: 'Principiante (A1)',
    description: 'Frases simples y vocabulario básico de uso cotidiano.',
    sortOrder: 1,
  },
  {
    code: 'A2',
    name: 'Básico (A2)',
    description: 'Textos cortos sobre situaciones cotidianas y rutinas.',
    sortOrder: 2,
  },
  {
    code: 'B1',
    name: 'Intermedio (B1)',
    description: 'Narraciones con estructuras variadas y tiempos verbales mixtos.',
    sortOrder: 3,
  },
  {
    code: 'B2',
    name: 'Intermedio alto (B2)',
    description: 'Textos extensos, vocabulario amplio y matices de significado.',
    sortOrder: 4,
  },
] as const;

/** Crea los niveles de lectura base. Es idempotente. */
@Injectable()
export class ReadingLevelsSeeder {
  private readonly logger = new Logger(ReadingLevelsSeeder.name);

  constructor(private readonly prisma: PrismaService) {}

  async run(): Promise<void> {
    for (const level of READING_LEVELS) {
      await this.prisma.readingLevel.upsert({
        where: { code: level.code },
        // No se fuerza `isActive` en la actualización para respetar el estado
        // que un administrador haya definido desde el panel.
        update: {
          name: level.name,
          description: level.description,
          sortOrder: level.sortOrder,
        },
        create: {
          code: level.code,
          name: level.name,
          description: level.description,
          sortOrder: level.sortOrder,
          isActive: true,
        },
      });
    }

    this.logger.log(`Niveles de lectura sincronizados: ${READING_LEVELS.length}.`);
  }
}
