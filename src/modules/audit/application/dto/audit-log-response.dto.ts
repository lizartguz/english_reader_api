import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Referencia mínima al usuario que ejecutó la acción auditada. */
export class AuditLogActorRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  fullName!: string;
}

/** Registro de auditoría expuesto al panel administrativo. */
export class AuditLogResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ type: AuditLogActorRefDto, nullable: true })
  actor!: AuditLogActorRefDto | null;

  @ApiProperty({ example: 'story.created' })
  action!: string;

  @ApiProperty({ example: 'Story' })
  entityType!: string;

  @ApiPropertyOptional({ nullable: true })
  entityId!: string | null;

  @ApiProperty()
  summary!: string;

  @ApiPropertyOptional({ nullable: true })
  metadata!: unknown;

  @ApiPropertyOptional({ nullable: true })
  ipAddress!: string | null;

  @ApiProperty()
  createdAt!: Date;
}
