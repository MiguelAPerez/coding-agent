CREATE TABLE `agent_configuration` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`model` text DEFAULT '' NOT NULL,
	`systemPromptId` text,
	`systemPrompt` text DEFAULT 'You are a helpful coding assistant.' NOT NULL,
	`temperature` integer DEFAULT 70 NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`systemPromptId`) REFERENCES `system_prompt`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `benchmark_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`benchmarkId` text NOT NULL,
	`model` text NOT NULL,
	`contextGroupId` text NOT NULL,
	`category` text,
	`score` integer,
	`metrics` text,
	`prompt` text,
	`systemContext` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`output` text,
	`error` text,
	`duration` integer,
	`systemPromptId` text,
	`startedAt` integer,
	`completedAt` integer,
	FOREIGN KEY (`benchmarkId`) REFERENCES `benchmark`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contextGroupId`) REFERENCES `context_group`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`systemPromptId`) REFERENCES `system_prompt`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `benchmark_run` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`models` text NOT NULL,
	`contextGroupIds` text NOT NULL,
	`systemPromptIds` text,
	`systemPromptSetIds` text,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `benchmark` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`runId` text,
	`name` text NOT NULL,
	`status` text DEFAULT 'idle' NOT NULL,
	`startedAt` integer,
	`completedAt` integer,
	`totalEntries` integer DEFAULT 0 NOT NULL,
	`completedEntries` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`runId`) REFERENCES `benchmark_run`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `context_group` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text,
	`expectations` text,
	`weight` real,
	`maxSentences` integer,
	`systemContext` text,
	`promptTemplate` text NOT NULL,
	`skillIds` text,
	`toolIds` text,
	`systemPromptIds` text,
	`systemPromptSetIds` text,
	`systemPromptVariations` text,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `gitea_configuration` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`url` text NOT NULL,
	`username` text NOT NULL,
	`token` text NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gitea_configuration_userId_unique` ON `gitea_configuration` (`userId`);--> statement-breakpoint
CREATE TABLE `ollama_configuration` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`url` text NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ollama_configuration_userId_unique` ON `ollama_configuration` (`userId`);--> statement-breakpoint
CREATE TABLE `ollama_model` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`details` text,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `repository` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`source` text NOT NULL,
	`externalId` text NOT NULL,
	`name` text NOT NULL,
	`fullName` text NOT NULL,
	`description` text,
	`url` text NOT NULL,
	`stars` integer DEFAULT 0,
	`forks` integer DEFAULT 0,
	`language` text,
	`topics` text,
	`lastAnalyzedHash` text,
	`docs_metadata` text,
	`agent_metadata` text,
	`analyzedAt` integer,
	`updatedAt` integer NOT NULL,
	`cachedAt` integer NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `skill` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`agentId` text,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`content` text NOT NULL,
	`isEnabled` integer DEFAULT true NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agentId`) REFERENCES `agent_configuration`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `system_prompt_set` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`systemPromptIds` text NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `system_prompt` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`content` text NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tool` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`agentId` text,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`schema` text NOT NULL,
	`isEnabled` integer DEFAULT true NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agentId`) REFERENCES `agent_configuration`(`id`) ON UPDATE no action ON DELETE cascade
);
