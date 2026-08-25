/**
 * Origen de un registro técnico. Permite filtrar `system_logs` por subsistema
 * desde el panel administrativo.
 */
export enum SystemLogSource {
  Http = 'http',
  Database = 'database',
  Auth = 'auth',
  Mail = 'mail',
  Storage = 'storage',
  DictionaryProvider = 'dictionary_provider',
  TranslationProvider = 'translation_provider',
  Scheduler = 'scheduler',
  Application = 'application',
}
