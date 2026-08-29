import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@/common/enums/domain.enums';

/** Identidad y capacidades del usuario autenticado. */
export class AuthenticatedUserResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'admin@englishreader.local' })
  email!: string;

  @ApiProperty({ example: 'Ana' })
  firstName!: string;

  @ApiProperty({ example: 'García' })
  lastName!: string;

  @ApiProperty({ example: 'Ana García' })
  fullName!: string;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiPropertyOptional({ nullable: true })
  phoneNumber!: string | null;

  @ApiProperty({ type: [String], example: ['ADMIN'] })
  roles!: string[];

  @ApiProperty({
    type: [String],
    description: 'Permisos efectivos. React Admin puede usarlos para ocultar opciones del menú.',
  })
  permissions!: string[];

  @ApiPropertyOptional({ nullable: true })
  emailVerifiedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  lastLoginAt!: Date | null;
}

/** Sesión emitida tras un inicio de sesión o una renovación. */
export class AuthSessionResponse {
  @ApiProperty({ description: 'Access token de corta duración.' })
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: string;

  @ApiProperty({ description: 'Segundos de vigencia del access token.', example: 900 })
  expiresIn!: number;

  @ApiPropertyOptional({
    description:
      'Refresh token. Solo se devuelve a clientes móviles; en web y app_web viaja en cookie HttpOnly.',
  })
  refreshToken?: string;

  @ApiProperty({ description: 'Momento en que la sesión expira de forma absoluta.' })
  sessionExpiresAt!: Date;

  @ApiProperty({ type: AuthenticatedUserResponse })
  user!: AuthenticatedUserResponse;
}

/** Resultado de comprobar si la sesión sigue vigente. */
export class SessionStatusResponse {
  @ApiProperty({ example: true })
  valid!: boolean;

  @ApiProperty()
  sessionExpiresAt!: Date;

  @ApiProperty({ type: AuthenticatedUserResponse })
  user!: AuthenticatedUserResponse;
}
