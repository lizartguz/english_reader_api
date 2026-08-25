import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/** Expone el endpoint de estado de la API. */
@Module({ controllers: [HealthController] })
export class HealthModule {}
