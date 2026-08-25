import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { configurations, validateEnvironment } from '@/config';
import { PrismaModule } from '@/database/prisma.module';
import { SecurityModule } from '@/common/security/security.module';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { validationExceptionFactory } from '@/common/pipes/validation-exception.factory';
import { SystemLogsModule } from '@/modules/system-logs/system-logs.module';
import { AuditModule } from '@/modules/audit/audit.module';
import { MailModule } from '@/modules/mail/mail.module';
import { UsersModule } from '@/modules/users/users.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { HealthModule } from '@/modules/health/health.module';
import { ReadingLevelsModule } from '@/modules/reading-levels/reading-levels.module';
import { GenresModule } from '@/modules/genres/genres.module';
import { StoriesModule } from '@/modules/stories/stories.module';
import { RolesModule } from '@/modules/roles/roles.module';
import { DictionaryModule } from '@/modules/dictionary/dictionary.module';
import { VocabularyModule } from '@/modules/vocabulary/vocabulary.module';
import { ReadingProgressModule } from '@/modules/reading-progress/reading-progress.module';
import { FilesModule } from '@/modules/files/files.module';

/**
 * Módulo raíz de la API.
 *
 * Registra la configuración validada, la conexión a base de datos, los módulos
 * funcionales y la seguridad transversal. El orden de los guards globales es
 * significativo: primero se limita el uso, después se identifica al usuario y
 * por último se evalúan rol y permisos.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: configurations,
      validate: validateEnvironment,
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: (configService.get<number>('security.throttle.ttlSeconds') ?? 60) * 1000,
            limit: configService.get<number>('security.throttle.limit') ?? 120,
          },
        ],
      }),
    }),

    ScheduleModule.forRoot(),

    PrismaModule,
    SecurityModule,
    SystemLogsModule,
    AuditModule,
    MailModule,

    HealthModule,
    UsersModule,
    AuthModule,
    ReadingLevelsModule,
    GenresModule,
    StoriesModule,
    RolesModule,
    DictionaryModule,
    VocabularyModule,
    ReadingProgressModule,
    FilesModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          // Se descartan las propiedades no declaradas para que ningún cliente
          // pueda inyectar campos que el DTO no contempla.
          whitelist: true,
          forbidNonWhitelisted: false,
          transform: true,
          transformOptions: { enableImplicitConversion: false },
          exceptionFactory: validationExceptionFactory,
        }),
    },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
