CREATE TABLE `background_job` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`startedAt` integer NOT NULL,
	`completedAt` integer,
	`error` text,
	`details` text
);
--> statement-breakpoint
CREATE TABLE `code_embedding` (
	`id` text PRIMARY KEY NOT NULL,
	`repositoryId` text NOT NULL,
	`filePath` text NOT NULL,
	`lineNumber` integer NOT NULL,
	`contentChunk` text NOT NULL,
	`embedding` text NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`repositoryId`) REFERENCES `repository`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_repository`("id", "userId", "source", "externalId", "name", "fullName", "description", "url", "stars", "forks", "language", "topics", "lastAnalyzedHash", "docs_metadata", "agent_metadata", "analyzedAt", "updatedAt", "cachedAt", "enabled") SELECT "id", "userId", "source", "externalId", "name", "fullName", "description", "url", "stars", "forks", "language", "topics", "lastAnalyzedHash", "docs_metadata", "agent_metadata", "analyzedAt", "updatedAt", "cachedAt", "enabled" FROM `repository`;--> statement-breakpoint
DROP TABLE `repository`;--> statement-breakpoint
ALTER TABLE `__new_repository` RENAME TO `repository`;--> statement-breakpoint
PRAGMA foreign_keys=ON;