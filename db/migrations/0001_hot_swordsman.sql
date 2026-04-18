ALTER TABLE `assignments` ADD `selected_model_id` text;--> statement-breakpoint
ALTER TABLE `criterion_scores` ADD `needs_review` integer DEFAULT false NOT NULL;