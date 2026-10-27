CREATE TABLE `contamination` (
	`id` text PRIMARY KEY NOT NULL,
	`observation_id` text NOT NULL,
	`kind` text NOT NULL,
	`severity` text NOT NULL,
	`action` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`observation_id`) REFERENCES `observation`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `contamination_observation` ON `contamination` (`observation_id`);--> statement-breakpoint
ALTER TABLE `observation` ADD `flush` integer;