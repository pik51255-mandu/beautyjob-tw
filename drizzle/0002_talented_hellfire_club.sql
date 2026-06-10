CREATE TABLE `job_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobPostId` int NOT NULL,
	`applicantId` int NOT NULL,
	`coverLetter` text,
	`status` enum('pending','reviewed','accepted','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_app_job` ON `job_applications` (`jobPostId`);--> statement-breakpoint
CREATE INDEX `idx_app_applicant` ON `job_applications` (`applicantId`);