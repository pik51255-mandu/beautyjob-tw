CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`postType` enum('community','salon_transfer','used_item') NOT NULL,
	`postId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`category` enum('general','technique','education','news','qa') NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`viewCount` int NOT NULL DEFAULT 0,
	`commentCount` int NOT NULL DEFAULT 0,
	`isPinned` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `community_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`targetType` enum('job_post','resume','salon_transfer','used_item') NOT NULL,
	`targetId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`salonName` varchar(100) NOT NULL,
	`jobType` enum('designer','intern','staff','colorist','barber','manager','other') NOT NULL,
	`workType` enum('full_time','part_time','contract') NOT NULL,
	`city` varchar(50) NOT NULL,
	`district` varchar(50),
	`address` text,
	`salaryType` enum('monthly','hourly','commission') NOT NULL,
	`salaryMin` decimal,
	`salaryMax` decimal,
	`experienceRequired` enum('none','1year','2year','3year','5year','10year') NOT NULL DEFAULT 'none',
	`description` text NOT NULL,
	`benefits` text,
	`contactInfo` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`viewCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resumes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fullName` varchar(100) NOT NULL,
	`jobType` enum('designer','intern','staff','colorist','barber','manager','other') NOT NULL,
	`experienceYears` int NOT NULL DEFAULT 0,
	`currentCity` varchar(50) NOT NULL,
	`desiredCity` varchar(50),
	`desiredSalaryMin` decimal,
	`desiredSalaryMax` decimal,
	`desiredWorkType` enum('full_time','part_time','contract','any') DEFAULT 'any',
	`skills` text,
	`introduction` text NOT NULL,
	`portfolioUrl` text,
	`isPublic` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resumes_id` PRIMARY KEY(`id`),
	CONSTRAINT `resumes_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `salon_transfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`salonName` varchar(100),
	`city` varchar(50) NOT NULL,
	`district` varchar(50),
	`address` text,
	`sizeM2` decimal(8,2),
	`keyMoney` decimal(12,0),
	`deposit` decimal(12,0),
	`monthlyRent` decimal,
	`description` text NOT NULL,
	`contactInfo` text,
	`imageUrls` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`viewCount` int NOT NULL DEFAULT 0,
	`commentCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `salon_transfers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `used_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`category` enum('chair','dryer','washer','scissors','chemical','furniture','other') NOT NULL,
	`condition` enum('new','like_new','good','fair') NOT NULL,
	`price` decimal NOT NULL,
	`city` varchar(50) NOT NULL,
	`description` text NOT NULL,
	`imageUrls` text,
	`isSold` boolean NOT NULL DEFAULT false,
	`viewCount` int NOT NULL DEFAULT 0,
	`commentCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `used_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `userType` enum('salon_owner','job_seeker','unset') DEFAULT 'unset' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(30);--> statement-breakpoint
ALTER TABLE `users` ADD `city` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
CREATE INDEX `idx_comment_post` ON `comments` (`postType`,`postId`);--> statement-breakpoint
CREATE INDEX `idx_community_category` ON `community_posts` (`category`);--> statement-breakpoint
CREATE INDEX `idx_fav_user` ON `favorites` (`userId`,`targetType`);--> statement-breakpoint
CREATE INDEX `idx_job_city` ON `job_posts` (`city`);--> statement-breakpoint
CREATE INDEX `idx_job_type` ON `job_posts` (`jobType`);--> statement-breakpoint
CREATE INDEX `idx_job_active` ON `job_posts` (`isActive`);--> statement-breakpoint
CREATE INDEX `idx_resume_city` ON `resumes` (`currentCity`);--> statement-breakpoint
CREATE INDEX `idx_resume_jobtype` ON `resumes` (`jobType`);--> statement-breakpoint
CREATE INDEX `idx_transfer_city` ON `salon_transfers` (`city`);--> statement-breakpoint
CREATE INDEX `idx_used_category` ON `used_items` (`category`);--> statement-breakpoint
CREATE INDEX `idx_used_city` ON `used_items` (`city`);