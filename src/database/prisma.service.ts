import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@/generated/prisma/client';
import type { Prisma } from '@/generated/prisma/client';

/** Cliente de Prisma limitado al contexto de una transacción. */
export type PrismaTransaction = Prisma.TransactionClient;

/**
 * Cliente de base de datos de la aplicación.
 *
 * Prisma 7 requiere un driver adapter; para MySQL/MariaDB se usa
 * `@prisma/adapter-mariadb`. El nombre de la base se pasa de forma explícita
 * porque el adaptador lo necesita para construir las consultas.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private static readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    const url = configService.get<string>('database.url') as string;

    super({
      adapter: new PrismaMariaDb(url, { database: PrismaService.extractDatabaseName(url) }),
      log: [
        { level: 'warn', emit: 'stdout' },
        { level: 'error', emit: 'stdout' },
      ],
    });
  }

  /** Obtiene el nombre de la base a partir de la cadena de conexión. */
  private static extractDatabaseName(url: string): string | undefined {
    try {
      const parsed = new URL(url);
      const name = parsed.pathname.replace(/^\//, '');
      return name.length > 0 ? decodeURIComponent(name) : undefined;
    } catch {
      return undefined;
    }
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    PrismaService.logger.log('Conexión a la base de datos establecida.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Ejecuta varias operaciones dependientes dentro de una misma transacción.
   *
   * Si cualquier paso falla, la transacción completa se revierte. Los casos de
   * uso deben apoyarse en este método en lugar de encadenar escrituras sueltas.
   */
  runInTransaction<T>(
    handler: (tx: PrismaTransaction) => Promise<T>,
    options?: { maxWait?: number; timeout?: number },
  ): Promise<T> {
    return this.$transaction(handler, {
      maxWait: options?.maxWait ?? 5000,
      timeout: options?.timeout ?? 15000,
    });
  }
}
