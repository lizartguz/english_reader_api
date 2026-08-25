-- AlterTable
ALTER TABLE `stories` ADD COLUMN `author` VARCHAR(150) NULL;

-- CreateTable
CREATE TABLE `genres` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `genres_code_key`(`code`),
    INDEX `genres_is_active_idx`(`is_active`),
    INDEX `genres_sort_order_idx`(`sort_order`),
    INDEX `genres_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `story_genres` (
    `id` VARCHAR(36) NOT NULL,
    `story_id` VARCHAR(36) NOT NULL,
    `genre_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `story_genres_story_id_idx`(`story_id`),
    INDEX `story_genres_genre_id_idx`(`genre_id`),
    UNIQUE INDEX `story_genres_story_id_genre_id_key`(`story_id`, `genre_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `story_genres` ADD CONSTRAINT `story_genres_story_id_fkey` FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `story_genres` ADD CONSTRAINT `story_genres_genre_id_fkey` FOREIGN KEY (`genre_id`) REFERENCES `genres`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
