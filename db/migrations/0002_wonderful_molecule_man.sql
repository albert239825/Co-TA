PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_grading_results` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`model_used` text DEFAULT 'gpt-5-mini' NOT NULL,
	`graded_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_grading_results`("id", "submission_id", "model_used", "graded_at", "created_at", "updated_at") SELECT "id", "submission_id", "model_used", "graded_at", "created_at", "updated_at" FROM `grading_results`;--> statement-breakpoint
DROP TABLE `grading_results`;--> statement-breakpoint
ALTER TABLE `__new_grading_results` RENAME TO `grading_results`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `grading_results_submission_id_unique` ON `grading_results` (`submission_id`);