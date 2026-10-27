-- Hand edit: drizzle-kit left ON DELETE off the added column. Without it, deleting a task whose Done made the next one would fail.
ALTER TABLE `task` ADD `repeat_until` text;--> statement-breakpoint
ALTER TABLE `task` ADD `previous_task_id` text REFERENCES task(id) ON DELETE set null;--> statement-breakpoint
CREATE INDEX `task_batch` ON `task` (`batch_id`);
