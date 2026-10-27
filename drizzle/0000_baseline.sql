CREATE TABLE `batch` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`batch_type` text NOT NULL,
	`protocol_id` text,
	`protocol_snapshot_json` text,
	`space_id` text,
	`started_at` text,
	`ended_at` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`phase` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`protocol_id`) REFERENCES `protocol`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`space_id`) REFERENCES `space`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `batch_status` ON `batch` (`status`);--> statement-breakpoint
CREATE INDEX `batch_type` ON `batch` (`batch_type`);--> statement-breakpoint
CREATE TABLE `batch_equipment` (
	`batch_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`batch_id`, `equipment_id`),
	FOREIGN KEY (`batch_id`) REFERENCES `batch`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`model` text,
	`specs_json` text,
	`space_id` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`space_id`) REFERENCES `space`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `inventory_item` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text,
	`name` text NOT NULL,
	`quantity` real,
	`unit` text,
	`space_id` text,
	`packed_at` text,
	`use_by` text,
	`status` text DEFAULT 'in_stock' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `batch`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`space_id`) REFERENCES `space`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `observation` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`observed_at` text NOT NULL,
	`phase` text,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `batch`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `observation_batch` ON `observation` (`batch_id`,`observed_at`);--> statement-breakpoint
CREATE TABLE `outcome` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`yield_value` real,
	`yield_unit` text,
	`rating` integer,
	`summary` text,
	`would_change` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `batch`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outcome_batch_id_unique` ON `outcome` (`batch_id`);--> statement-breakpoint
CREATE TABLE `photo` (
	`id` text PRIMARY KEY NOT NULL,
	`observation_id` text NOT NULL,
	`path` text NOT NULL,
	`original_path` text,
	`caption` text,
	`taken_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`observation_id`) REFERENCES `observation`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `photo_observation` ON `photo` (`observation_id`);--> statement-breakpoint
CREATE TABLE `protocol` (
	`id` text PRIMARY KEY NOT NULL,
	`family_id` text NOT NULL,
	`name` text NOT NULL,
	`batch_type` text NOT NULL,
	`version` integer NOT NULL,
	`source` text,
	`body_json` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `protocol_family_version` ON `protocol` (`family_id`,`version`);--> statement-breakpoint
CREATE TABLE `reading` (
	`id` text PRIMARY KEY NOT NULL,
	`observation_id` text NOT NULL,
	`kind` text NOT NULL,
	`value` real NOT NULL,
	`unit` text NOT NULL,
	`taken_at` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`observation_id`) REFERENCES `observation`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reading_observation` ON `reading` (`observation_id`);--> statement-breakpoint
CREATE INDEX `reading_kind` ON `reading` (`kind`);--> statement-breakpoint
CREATE TABLE `space` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`parent_space_id` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`parent_space_id`) REFERENCES `space`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `task` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text,
	`title` text NOT NULL,
	`due_at` text,
	`done_at` text,
	`recurrence` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `batch`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `task_due` ON `task` (`due_at`);