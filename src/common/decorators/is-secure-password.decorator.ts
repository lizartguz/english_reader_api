import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Política de contraseñas aplicada a todo el sistema. */
export const PASSWORD_POLICY = {
  MinLength: 8,
  MaxLength: 72,
  Description:
    'Debe tener al menos 8 caracteres e incluir una minúscula, una mayúscula y un número.',
} as const;

/**
 * Valida que una contraseña cumpla la política mínima del sistema.
 *
 * Se declara como decorador compuesto para que la regla viva en un único lugar
 * y no se repita en cada DTO que reciba contraseñas.
 */
export const IsSecurePassword = () =>
  applyDecorators(
    IsString({ message: 'La contraseña es obligatoria.' }),
    MinLength(PASSWORD_POLICY.MinLength, {
      message: `La contraseña debe tener al menos ${PASSWORD_POLICY.MinLength} caracteres.`,
    }),
    MaxLength(PASSWORD_POLICY.MaxLength, {
      message: `La contraseña no puede superar los ${PASSWORD_POLICY.MaxLength} caracteres.`,
    }),
    Matches(/[a-z]/, { message: 'La contraseña debe incluir al menos una letra minúscula.' }),
    Matches(/[A-Z]/, { message: 'La contraseña debe incluir al menos una letra mayúscula.' }),
    Matches(/[0-9]/, { message: 'La contraseña debe incluir al menos un número.' }),
  );
