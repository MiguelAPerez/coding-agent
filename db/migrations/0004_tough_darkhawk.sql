CREATE TABLE `agent_usage_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`agentId` text NOT NULL,
	`date` text NOT NULL,
	`totalInputTokens` integer DEFAULT 0 NOT NULL,
	`totalOutputTokens` integer DEFAULT 0 NOT NULL,
	`totalDuration` integer DEFAULT 0 NOT NULL,
	`messageCount` integer DEFAULT 0 NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`agentId`) REFERENCES `agent_configuration`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `anthropic_configuration` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`apiKey` text NOT NULL,
	`totalInputTokens` integer DEFAULT 0 NOT NULL,
	`totalOutputTokens` integer DEFAULT 0 NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `anthropic_configuration_userId_unique` ON `anthropic_configuration` (`userId`);--> statement-breakpoint
CREATE TABLE `anthropic_model` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`details` text,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `google_configuration` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`apiKey` text NOT NULL,
	`totalInputTokens` integer DEFAULT 0 NOT NULL,
	`totalOutputTokens` integer DEFAULT 0 NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `google_configuration_userId_unique` ON `google_configuration` (`userId`);--> statement-breakpoint
CREATE TABLE `google_model` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`details` text,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `chat` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`agentId` text,
	`repoId` text,
	`type` text DEFAULT 'web' NOT NULL,
	`externalId` text,
	`title` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agentId`) REFERENCES `agent_configuration`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`repoId`) REFERENCES `repository`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `message` (
	`id` text PRIMARY KEY NOT NULL,
	`chatId` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`externalId` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`chatId`) REFERENCES `chat`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `connection` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`agentId` text,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`config` text NOT NULL,
	`metadata` text,
	`token_limit_daily` integer,
	`tokens_used_today` integer DEFAULT 0 NOT NULL,
	`tokens_last_reset_at` integer,
	`enabled` integer DEFAULT true NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agentId`) REFERENCES `agent_configuration`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_agent_configuration` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`provider` text DEFAULT 'ollama' NOT NULL,
	`model` text DEFAULT '' NOT NULL,
	`systemPromptId` text,
	`systemPrompt` text DEFAULT 'You are a helpful coding assistant.' NOT NULL,
	`temperature` integer DEFAULT 70 NOT NULL,
	`isManaged` integer DEFAULT false NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`systemPromptId`) REFERENCES `system_prompt`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_agent_configuration`("id", "userId", "name", "provider", "model", "systemPromptId", "systemPrompt", "temperature", "isManaged", "updatedAt") SELECT "id", "userId", "name", "provider", "model", "systemPromptId", "systemPrompt", "temperature", "isManaged", "updatedAt" FROM `agent_configuration`;--> statement-breakpoint
DROP TABLE `agent_configuration`;--> statement-breakpoint
ALTER TABLE `__new_agent_configuration` RENAME TO `agent_configuration`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_benchmark_entry` (
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
	FOREIGN KEY (`benchmarkId`) REFERENCES `benchmark`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_benchmark_entry`("id", "benchmarkId", "model", "contextGroupId", "category", "score", "metrics", "prompt", "systemContext", "status", "output", "error", "duration", "systemPromptId", "startedAt", "completedAt") SELECT "id", "benchmarkId", "model", "contextGroupId", "category", "score", "metrics", "prompt", "systemContext", "status", "output", "error", "duration", "systemPromptId", "startedAt", "completedAt" FROM `benchmark_entry`;--> statement-breakpoint
DROP TABLE `benchmark_entry`;--> statement-breakpoint
ALTER TABLE `__new_benchmark_entry` RENAME TO `benchmark_entry`;--> statement-breakpoint
CREATE TABLE `__new_github_configuration` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`appId` text NOT NULL,
	`clientId` text NOT NULL,
	`clientSecret` text NOT NULL,
	`privateKey` text NOT NULL,
	`installationId` text,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_github_configuration`("id", "userId", "name", "appId", "clientId", "clientSecret", "privateKey", "installationId", "updatedAt") SELECT "id", "userId", "name", "appId", "clientId", "clientSecret", "privateKey", "installationId", "updatedAt" FROM `github_configuration`;--> statement-breakpoint
DROP TABLE `github_configuration`;--> statement-breakpoint
ALTER TABLE `__new_github_configuration` RENAME TO `github_configuration`;--> statement-breakpoint
CREATE TABLE `__new_repository` (
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
	`enabled` integer DEFAULT false NOT NULL,
	`githubConfigurationId` text,
	FOREIGN KEY (`githubConfigurationId`) REFERENCES `github_configuration`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_repository`("id", "userId", "source", "externalId", "name", "fullName", "description", "url", "stars", "forks", "language", "topics", "lastAnalyzedHash", "docs_metadata", "agent_metadata", "analyzedAt", "updatedAt", "cachedAt", "enabled", "githubConfigurationId") SELECT "id", "userId", "source", "externalId", "name", "fullName", "description", "url", "stars", "forks", "language", "topics", "lastAnalyzedHash", "docs_metadata", "agent_metadata", "analyzedAt", "updatedAt", "cachedAt", "enabled", "githubConfigurationId" FROM `repository`;--> statement-breakpoint
DROP TABLE `repository`;--> statement-breakpoint
ALTER TABLE `__new_repository` RENAME TO `repository`;--> statement-breakpoint
CREATE TABLE `__new_system_prompt` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`content` text NOT NULL,
	`isManaged` integer DEFAULT false NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_system_prompt`("id", "userId", "name", "content", "isManaged", "updatedAt") SELECT "id", "userId", "name", "content", "isManaged", "updatedAt" FROM `system_prompt`;--> statement-breakpoint
DROP TABLE `system_prompt`;--> statement-breakpoint
ALTER TABLE `__new_system_prompt` RENAME TO `system_prompt`;--> statement-breakpoint
ALTER TABLE `user` ADD `mainBranchProtected` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `configRepositoryId` text REFERENCES repository(id);