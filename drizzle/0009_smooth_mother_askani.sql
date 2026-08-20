CREATE TABLE `salons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taxId` varchar(8) NOT NULL,
	`name` varchar(200) NOT NULL,
	`address` varchar(300) NOT NULL,
	`district` varchar(20) NOT NULL,
	`lat` decimal(9,6),
	`lng` decimal(9,6),
	`foundedYear` int,
	`geoAccuracy` varchar(20) NOT NULL,
	`coordSource` varchar(100),
	`parkingJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `salons_id` PRIMARY KEY(`id`),
	CONSTRAINT `salons_taxId_unique` UNIQUE(`taxId`)
);
--> statement-breakpoint
CREATE INDEX `idx_salons_district` ON `salons` (`district`);