import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SystemLogLevel } from '@/common/enums/domain.enums';

/** Registro técnico expuesto al panel administrativo. Solo para SUPER_ADMIN. */
export class SystemLogResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: SystemLogLevel })
  level!: SystemLogLevel;

  @ApiProperty({ example: 'http' })
  source!: string;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional({ nullable: true })
  exceptionName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  errorCode!: string | null;

  @ApiPropertyOptional({ nullable: true })
  requestMethod!: string | null;

  @ApiPropertyOptional({ nullable: true })
  requestPath!: string | null;

  @ApiPropertyOptional({ nullable: true })
  actorUserId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  ipAddress!: string | null;

  @ApiPropertyOptional({ nullable: true })
  userAgent!: string | null;

  @ApiPropertyOptional({ nullable: true })
  metadata!: unknown;

  @ApiProperty()
  createdAt!: Date;
}
