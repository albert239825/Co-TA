CREATE TABLE `assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `criterion_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`grading_result_id` text NOT NULL,
	`criterion_id` text NOT NULL,
	`earned` integer NOT NULL,
	`ai_feedback` text NOT NULL,
	`override_score` integer,
	`ta_comment` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`grading_result_id`) REFERENCES `grading_results`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`criterion_id`) REFERENCES `rubric_criteria`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `criterion_scores_result_criterion_unique` ON `criterion_scores` (`grading_result_id`,`criterion_id`);--> statement-breakpoint
CREATE TABLE `grading_results` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`model_used` text DEFAULT 'gpt-4o' NOT NULL,
	`graded_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `grading_results_submission_id_unique` ON `grading_results` (`submission_id`);--> statement-breakpoint
CREATE TABLE `problems` (
	`id` text PRIMARY KEY NOT NULL,
	`assignment_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`sort_order` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rubric_criteria` (
	`id` text PRIMARY KEY NOT NULL,
	`problem_id` text NOT NULL,
	`description` text NOT NULL,
	`points` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`assignment_id` text NOT NULL,
	`student_identifier` text NOT NULL,
	`file_name` text NOT NULL,
	`file_content` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON UPDATE no action ON DELETE cascade
);
