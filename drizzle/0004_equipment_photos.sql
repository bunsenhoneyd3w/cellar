CREATE TABLE `equipment_photo` (
	`id` text PRIMARY KEY NOT NULL,
	`equipment_id` text NOT NULL,
	`path` text NOT NULL,
	`original_path` text,
	`caption` text,
	`taken_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `equipment_photo_equipment` ON `equipment_photo` (`equipment_id`);