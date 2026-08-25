/**
 * Enumeraciones de dominio persistidas en base de datos.
 *
 * Se reexportan desde el cliente generado por Prisma para que exista una única
 * fuente de verdad: el esquema. Así se evita que el código y la base de datos
 * se desincronicen al agregar o renombrar valores.
 */
export {
  UserStatus,
  StoryStatus,
  StoryAssetType,
  FileAccessScope,
  ReviewStatus,
  SavedWordStatus,
  SystemLogLevel,
  PartOfSpeech,
} from '@/generated/prisma/enums';
