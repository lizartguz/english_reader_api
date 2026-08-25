import type { ValidationError } from 'class-validator';
import { AppException, type AppErrorDetail } from '@/common/exceptions/app.exception';
import { CommonMessages } from '@/common/constants/messages.constants';

/**
 * Aplana los errores de `class-validator`, incluidos los de objetos anidados,
 * a una lista de `{ field, message }`.
 */
function flatten(errors: ValidationError[], parentPath = ''): AppErrorDetail[] {
  const details: AppErrorDetail[] = [];

  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;

    for (const message of Object.values(error.constraints ?? {})) {
      details.push({ field: path, message });
    }

    if (error.children?.length) {
      details.push(...flatten(error.children, path));
    }
  }

  return details;
}

/**
 * Convierte los errores de validación en la respuesta estándar de la API.
 *
 * Los clientes reciben el detalle por campo para poder marcar los formularios,
 * junto con un mensaje general en español.
 */
export function validationExceptionFactory(errors: ValidationError[]): AppException {
  return AppException.validation(CommonMessages.ValidationFailed, flatten(errors));
}
