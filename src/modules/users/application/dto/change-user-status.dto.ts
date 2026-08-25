import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { UserStatus } from '@/common/enums/domain.enums';

/**
 * Estados que un administrador puede asignar manualmente.
 * `pending_verification` queda fuera: solo lo gestiona el flujo de auto-registro.
 */
export const ADMIN_ASSIGNABLE_STATUSES = [
  UserStatus.active,
  UserStatus.inactive,
  UserStatus.blocked,
] as const;

/** Cambia el estado de una cuenta. */
export class ChangeUserStatusDto {
  @ApiProperty({ enum: ADMIN_ASSIGNABLE_STATUSES, example: UserStatus.active })
  @IsIn(ADMIN_ASSIGNABLE_STATUSES, { message: 'El estado enviado no es válido.' })
  status!: (typeof ADMIN_ASSIGNABLE_STATUSES)[number];
}
