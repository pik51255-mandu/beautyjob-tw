CREATE TABLE `supply_stores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taxId` varchar(8) NOT NULL,
	`name` varchar(200) NOT NULL,
	`address` varchar(300) NOT NULL,
	`district` varchar(20) NOT NULL,
	`lat` decimal(9,6) NOT NULL,
	`lng` decimal(9,6) NOT NULL,
	`tier` int NOT NULL,
	`phone` varchar(40),
	`note` text,
	`coordSource` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supply_stores_id` PRIMARY KEY(`id`),
	CONSTRAINT `supply_stores_taxId_unique` UNIQUE(`taxId`)
);
--> statement-breakpoint
CREATE INDEX `idx_supply_district` ON `supply_stores` (`district`);--> statement-breakpoint
CREATE INDEX `idx_supply_tier` ON `supply_stores` (`tier`);