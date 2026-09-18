CREATE TABLE "storyteller_attempt" (
	"id" uuid PRIMARY KEY NOT NULL,
	"generation_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"state" text NOT NULL,
	"reserved_microusd" bigint NOT NULL,
	"charged_microusd" bigint,
	"policy" jsonb NOT NULL,
	"provider_id" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storyteller_attempt_state" CHECK ("storyteller_attempt"."state" IN ('reserved','dispatched','settled','uncertain','unsent')),
	CONSTRAINT "storyteller_attempt_settlement" CHECK (("storyteller_attempt"."state" IN ('settled','unsent')) = ("storyteller_attempt"."charged_microusd" IS NOT NULL)),
	CONSTRAINT "storyteller_attempt_amounts" CHECK ("storyteller_attempt"."reserved_microusd" >= 0 AND ("storyteller_attempt"."charged_microusd" IS NULL OR "storyteller_attempt"."charged_microusd" >= 0))
);
--> statement-breakpoint
CREATE TABLE "storyteller_funding" (
	"id" uuid PRIMARY KEY NOT NULL,
	"limit_microusd" bigint NOT NULL,
	"settled_microusd" bigint DEFAULT 0 NOT NULL,
	"reserved_microusd" bigint DEFAULT 0 NOT NULL,
	"stopped" boolean DEFAULT true NOT NULL,
	"verified_at" timestamp (3) with time zone NOT NULL,
	CONSTRAINT "storyteller_funding_nonnegative" CHECK ("storyteller_funding"."limit_microusd" >= 0 AND "storyteller_funding"."settled_microusd" >= 0 AND "storyteller_funding"."reserved_microusd" >= 0)
);
--> statement-breakpoint
CREATE TABLE "storyteller_publication" (
	"generation_id" uuid PRIMARY KEY NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"failure_code" text,
	CONSTRAINT "storyteller_publication_state" CHECK ("storyteller_publication"."state" IN ('pending','published','stale','blocked'))
);
--> statement-breakpoint
CREATE TABLE "storyteller_retry" (
	"generation_id" uuid NOT NULL,
	"retry_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL,
	CONSTRAINT "storyteller_retry_identity" UNIQUE("generation_id","retry_id")
);
--> statement-breakpoint
CREATE TABLE "storyteller_run" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"limit_microusd" bigint NOT NULL,
	"settled_microusd" bigint DEFAULT 0 NOT NULL,
	"reserved_microusd" bigint DEFAULT 0 NOT NULL,
	"max_attempts" integer NOT NULL,
	"admitted_attempts" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "storyteller_run_bounds" CHECK ("storyteller_run"."limit_microusd" >= 0 AND "storyteller_run"."settled_microusd" >= 0 AND "storyteller_run"."reserved_microusd" >= 0 AND "storyteller_run"."max_attempts" > 0 AND "storyteller_run"."admitted_attempts" BETWEEN 0 AND "storyteller_run"."max_attempts")
);
--> statement-breakpoint
ALTER TABLE "story_draft" ADD COLUMN "storyteller" jsonb;--> statement-breakpoint
ALTER TABLE "generation" ADD COLUMN "status_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "story" ADD COLUMN "storyteller" jsonb;--> statement-breakpoint
ALTER TABLE "story" ADD COLUMN "execution" jsonb;--> statement-breakpoint
ALTER TABLE "story" ADD COLUMN "continuity_notes" jsonb;--> statement-breakpoint
ALTER TABLE "storyteller_attempt" ADD CONSTRAINT "storyteller_attempt_generation_id_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyteller_attempt" ADD CONSTRAINT "storyteller_attempt_account_id_storyteller_funding_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."storyteller_funding"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyteller_attempt" ADD CONSTRAINT "storyteller_attempt_run_id_storyteller_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."storyteller_run"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyteller_publication" ADD CONSTRAINT "storyteller_publication_generation_id_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyteller_retry" ADD CONSTRAINT "storyteller_retry_generation_id_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyteller_run" ADD CONSTRAINT "storyteller_run_account_id_storyteller_funding_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."storyteller_funding"("id") ON DELETE restrict ON UPDATE no action;