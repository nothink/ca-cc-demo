-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `role` ENUM('admin', 'member') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Todo` (
    `id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `completed` BOOLEAN NOT NULL,
    `ownerId` VARCHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Todo_ownerId_idx`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Todo` ADD CONSTRAINT `Todo_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
