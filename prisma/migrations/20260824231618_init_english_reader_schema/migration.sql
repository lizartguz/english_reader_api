-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone_number` VARCHAR(30) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `status` ENUM('active', 'inactive', 'blocked', 'pending_verification') NOT NULL DEFAULT 'active',
    `email_verified_at` DATETIME(3) NULL,
    `phone_verified_at` DATETIME(3) NULL,
    `last_login_at` DATETIME(3) NULL,
    `failed_login_attempts` INTEGER NOT NULL DEFAULT 0,
    `locked_until` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_phone_number_key`(`phone_number`),
    INDEX `users_status_idx`(`status`),
    INDEX `users_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `module` VARCHAR(50) NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `permissions_code_key`(`code`),
    INDEX `permissions_module_idx`(`module`),
    INDEX `permissions_action_idx`(`action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `role_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_roles_role_id_idx`(`role_id`),
    UNIQUE INDEX `user_roles_user_id_role_id_key`(`user_id`, `role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `id` VARCHAR(36) NOT NULL,
    `role_id` VARCHAR(36) NOT NULL,
    `permission_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `role_permissions_permission_id_idx`(`permission_id`),
    UNIQUE INDEX `role_permissions_role_id_permission_id_key`(`role_id`, `permission_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `token_hash` VARCHAR(255) NOT NULL,
    `session_id` VARCHAR(36) NOT NULL,
    `session_expires_at` DATETIME(3) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `revoked_reason` VARCHAR(100) NULL,
    `replaced_by_token_id` VARCHAR(36) NULL,
    `device_identifier` VARCHAR(150) NULL,
    `platform` VARCHAR(50) NULL,
    `app_version` VARCHAR(50) NULL,
    `device_name` VARCHAR(150) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `refresh_tokens_token_hash_key`(`token_hash`),
    INDEX `refresh_tokens_user_id_idx`(`user_id`),
    INDEX `refresh_tokens_session_id_idx`(`session_id`),
    INDEX `refresh_tokens_device_identifier_idx`(`device_identifier`),
    INDEX `refresh_tokens_expires_at_idx`(`expires_at`),
    INDEX `refresh_tokens_revoked_at_idx`(`revoked_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_tokens` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NULL,
    `email` VARCHAR(255) NOT NULL,
    `token_hash` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `password_reset_tokens_token_hash_key`(`token_hash`),
    INDEX `password_reset_tokens_user_id_idx`(`user_id`),
    INDEX `password_reset_tokens_email_idx`(`email`),
    INDEX `password_reset_tokens_expires_at_idx`(`expires_at`),
    INDEX `password_reset_tokens_used_at_idx`(`used_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reading_levels` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `reading_levels_code_key`(`code`),
    INDEX `reading_levels_is_active_idx`(`is_active`),
    INDEX `reading_levels_sort_order_idx`(`sort_order`),
    INDEX `reading_levels_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stories` (
    `id` VARCHAR(36) NOT NULL,
    `reading_level_id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(220) NOT NULL,
    `summary` TEXT NULL,
    `content` LONGTEXT NOT NULL,
    `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `estimated_reading_minutes` INTEGER NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `published_at` DATETIME(3) NULL,
    `created_by_user_id` VARCHAR(36) NULL,
    `updated_by_user_id` VARCHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `stories_slug_key`(`slug`),
    INDEX `stories_reading_level_id_idx`(`reading_level_id`),
    INDEX `stories_status_idx`(`status`),
    INDEX `stories_published_at_idx`(`published_at`),
    INDEX `stories_deleted_at_idx`(`deleted_at`),
    INDEX `stories_created_by_user_id_idx`(`created_by_user_id`),
    INDEX `stories_updated_by_user_id_idx`(`updated_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `story_assets` (
    `id` VARCHAR(36) NOT NULL,
    `story_id` VARCHAR(36) NOT NULL,
    `type` ENUM('cover_image', 'audio', 'attachment') NOT NULL,
    `storage_disk` VARCHAR(50) NOT NULL DEFAULT 'local',
    `storage_path` VARCHAR(1000) NULL,
    `original_file_name` VARCHAR(255) NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `file_size_bytes` INTEGER NOT NULL,
    `access_scope` ENUM('private', 'public') NOT NULL DEFAULT 'private',
    `metadata` JSON NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `story_assets_story_id_idx`(`story_id`),
    INDEX `story_assets_type_idx`(`type`),
    INDEX `story_assets_access_scope_idx`(`access_scope`),
    INDEX `story_assets_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `word_entries` (
    `id` VARCHAR(36) NOT NULL,
    `word` VARCHAR(150) NOT NULL,
    `normalized_word` VARCHAR(150) NOT NULL,
    `language` VARCHAR(10) NOT NULL DEFAULT 'en',
    `phonetic` VARCHAR(150) NULL,
    `definition_en` TEXT NULL,
    `part_of_speech` ENUM('noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection', 'determiner', 'numeral', 'article', 'phrase', 'other') NULL,
    `source` VARCHAR(100) NULL,
    `review_status` ENUM('pending', 'reviewed', 'rejected') NOT NULL DEFAULT 'pending',
    `reviewed_by_user_id` VARCHAR(36) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `word_entries_review_status_idx`(`review_status`),
    INDEX `word_entries_part_of_speech_idx`(`part_of_speech`),
    INDEX `word_entries_reviewed_by_user_id_idx`(`reviewed_by_user_id`),
    INDEX `word_entries_deleted_at_idx`(`deleted_at`),
    UNIQUE INDEX `word_entries_normalized_word_language_key`(`normalized_word`, `language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `word_examples` (
    `id` VARCHAR(36) NOT NULL,
    `word_entry_id` VARCHAR(36) NOT NULL,
    `example_text` TEXT NOT NULL,
    `source` VARCHAR(100) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `word_examples_word_entry_id_idx`(`word_entry_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `word_pronunciations` (
    `id` VARCHAR(36) NOT NULL,
    `word_entry_id` VARCHAR(36) NOT NULL,
    `accent` VARCHAR(10) NULL,
    `phonetic` VARCHAR(150) NULL,
    `audio_url` VARCHAR(1000) NULL,
    `audio_storage_path` VARCHAR(500) NULL,
    `audio_mime_type` VARCHAR(100) NULL,
    `audio_cached_at` DATETIME(3) NULL,
    `source` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `word_pronunciations_word_entry_id_idx`(`word_entry_id`),
    INDEX `word_pronunciations_accent_idx`(`accent`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `word_translations` (
    `id` VARCHAR(36) NOT NULL,
    `word_entry_id` VARCHAR(36) NOT NULL,
    `target_language` VARCHAR(10) NOT NULL DEFAULT 'es',
    `translation` VARCHAR(255) NOT NULL,
    `meaning_context` TEXT NULL,
    `source` VARCHAR(100) NULL,
    `review_status` ENUM('pending', 'reviewed', 'rejected') NOT NULL DEFAULT 'pending',
    `reviewed_by_user_id` VARCHAR(36) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `word_translations_word_entry_id_idx`(`word_entry_id`),
    INDEX `word_translations_target_language_idx`(`target_language`),
    INDEX `word_translations_review_status_idx`(`review_status`),
    INDEX `word_translations_reviewed_by_user_id_idx`(`reviewed_by_user_id`),
    INDEX `word_translations_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_saved_words` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `word_entry_id` VARCHAR(36) NOT NULL,
    `story_id` VARCHAR(36) NULL,
    `status` ENUM('saved', 'learning', 'learned', 'archived') NOT NULL DEFAULT 'saved',
    `notes` TEXT NULL,
    `saved_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `user_saved_words_word_entry_id_idx`(`word_entry_id`),
    INDEX `user_saved_words_story_id_idx`(`story_id`),
    INDEX `user_saved_words_status_idx`(`status`),
    INDEX `user_saved_words_deleted_at_idx`(`deleted_at`),
    UNIQUE INDEX `user_saved_words_user_id_word_entry_id_key`(`user_id`, `word_entry_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reading_progress` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `story_id` VARCHAR(36) NOT NULL,
    `progress_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `last_position` VARCHAR(255) NULL,
    `completed_at` DATETIME(3) NULL,
    `last_read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `reading_progress_story_id_idx`(`story_id`),
    INDEX `reading_progress_last_read_at_idx`(`last_read_at`),
    UNIQUE INDEX `reading_progress_user_id_story_id_key`(`user_id`, `story_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(36) NOT NULL,
    `actor_user_id` VARCHAR(36) NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(100) NOT NULL,
    `entity_id` VARCHAR(36) NULL,
    `summary` VARCHAR(255) NOT NULL,
    `metadata` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_actor_user_id_idx`(`actor_user_id`),
    INDEX `audit_logs_action_idx`(`action`),
    INDEX `audit_logs_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    INDEX `audit_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_logs` (
    `id` VARCHAR(36) NOT NULL,
    `level` ENUM('info', 'warning', 'error', 'critical') NOT NULL DEFAULT 'error',
    `source` VARCHAR(100) NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `exception_name` VARCHAR(150) NULL,
    `error_code` VARCHAR(100) NULL,
    `request_method` VARCHAR(10) NULL,
    `request_path` VARCHAR(500) NULL,
    `actor_user_id` VARCHAR(36) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(500) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `system_logs_level_idx`(`level`),
    INDEX `system_logs_source_idx`(`source`),
    INDEX `system_logs_actor_user_id_idx`(`actor_user_id`),
    INDEX `system_logs_created_at_idx`(`created_at`),
    INDEX `system_logs_error_code_idx`(`error_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stories` ADD CONSTRAINT `stories_reading_level_id_fkey` FOREIGN KEY (`reading_level_id`) REFERENCES `reading_levels`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stories` ADD CONSTRAINT `stories_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stories` ADD CONSTRAINT `stories_updated_by_user_id_fkey` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `story_assets` ADD CONSTRAINT `story_assets_story_id_fkey` FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `word_entries` ADD CONSTRAINT `word_entries_reviewed_by_user_id_fkey` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `word_examples` ADD CONSTRAINT `word_examples_word_entry_id_fkey` FOREIGN KEY (`word_entry_id`) REFERENCES `word_entries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `word_pronunciations` ADD CONSTRAINT `word_pronunciations_word_entry_id_fkey` FOREIGN KEY (`word_entry_id`) REFERENCES `word_entries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `word_translations` ADD CONSTRAINT `word_translations_word_entry_id_fkey` FOREIGN KEY (`word_entry_id`) REFERENCES `word_entries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `word_translations` ADD CONSTRAINT `word_translations_reviewed_by_user_id_fkey` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_saved_words` ADD CONSTRAINT `user_saved_words_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_saved_words` ADD CONSTRAINT `user_saved_words_word_entry_id_fkey` FOREIGN KEY (`word_entry_id`) REFERENCES `word_entries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_saved_words` ADD CONSTRAINT `user_saved_words_story_id_fkey` FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reading_progress` ADD CONSTRAINT `reading_progress_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reading_progress` ADD CONSTRAINT `reading_progress_story_id_fkey` FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_logs` ADD CONSTRAINT `system_logs_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
