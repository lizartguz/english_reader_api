// Debe ir antes que cualquier otro import: hay constantes que se evalúan al
// cargar su módulo (por ejemplo `AUTH_THROTTLE`, que los decoradores `@Throttle`
// necesitan resueltas al declarar la clase) y leen `process.env` en ese momento,
// antes de que `ConfigModule` procese el archivo `.env`. Sin esto, esas
// variables quedarían siempre en su valor por defecto sin previo aviso.
import 'dotenv/config';

import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { CSRF_HEADER } from '@/modules/auth/application/services/auth-cookie.service';

/**
 * Arranque de la API.
 *
 * Configura prefijo versionado, seguridad de cabeceras, CORS por ambiente,
 * lectura de cookies y documentación OpenAPI.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
  });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const apiPrefix = configService.get<string>('app.apiPrefix') as string;
  const apiVersion = configService.get<string>('app.apiVersion') as string;
  const port = configService.get<number>('app.port') as number;
  const corsOrigins = configService.get<string[]>('app.corsOrigins') ?? [];
  const swaggerEnabled = configService.get<boolean>('app.swaggerEnabled') ?? false;
  const appName = configService.get<string>('app.name') as string;

  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: apiVersion.replace(/^v/, ''),
    prefix: 'v',
  });

  app.use(helmet());
  app.use(cookieParser());

  // La API es consumida por clientes en otros orígenes; se listan de forma
  // explícita por ambiente y nunca se abre con comodín.
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', CSRF_HEADER],
    exposedHeaders: ['Content-Disposition'],
  });

  // Necesario para obtener la IP real detrás del proxy inverso en producción.
  app.set('trust proxy', 1);

  if (swaggerEnabled) {
    const documentConfig = new DocumentBuilder()
      .setTitle(`${appName} - Documentación de contratos`)
      .setDescription(
        'Contratos HTTP consumidos por el panel administrativo React y por la aplicación Flutter. ' +
          'Todas las respuestas usan la envoltura `{ success, message, data, meta }`.',
      )
      .setVersion(apiVersion)
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .build();

    const document = SwaggerModule.createDocument(app, documentConfig);

    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  app.enableShutdownHooks();

  await app.listen(port);

  logger.log(`API disponible en http://localhost:${port}/${apiPrefix}/${apiVersion}`);

  if (swaggerEnabled) {
    logger.log(`Documentación disponible en http://localhost:${port}/${apiPrefix}/docs`);
  }
}

void bootstrap();
