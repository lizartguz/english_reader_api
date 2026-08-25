import { StoryStatus } from '@/common/enums/domain.enums';

/**
 * Transiciones de estado permitidas para una historia.
 *
 * `draft -> published` y `archived -> published` exigen que el nivel de
 * lectura asociado esté activo; esa validación ocurre en el caso de uso, no
 * aquí, porque depende de una consulta a base de datos.
 */
const ALLOWED_TRANSITIONS: Record<StoryStatus, readonly StoryStatus[]> = {
  [StoryStatus.draft]: [StoryStatus.published, StoryStatus.archived],
  [StoryStatus.published]: [StoryStatus.draft, StoryStatus.archived],
  [StoryStatus.archived]: [StoryStatus.draft, StoryStatus.published],
};

/** Indica si se permite pasar de un estado a otro. */
export function isStoryTransitionAllowed(from: StoryStatus, to: StoryStatus): boolean {
  if (from === to) return true;

  return ALLOWED_TRANSITIONS[from].includes(to);
}
