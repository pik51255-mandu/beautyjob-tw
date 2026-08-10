CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reporterId` int NOT NULL,
	`targetType` enum('community','salon_transfer','used_item') NOT NULL,
	`targetId` int NOT NULL,
	`reason` enum('spam','fraud','offensive','illegal','other') NOT NULL,
	`detail` text,
	`status` enum('pending','resolved','dismissed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_report_status` ON `reports` (`status`);--> statement-breakpoint
CREATE INDEX `idx_report_target` ON `reports` (`targetType`,`targetId`);