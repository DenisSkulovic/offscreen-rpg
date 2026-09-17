CREATE TABLE "draft_opening" (
	"draft_id" uuid PRIMARY KEY NOT NULL,
	"generation_id" uuid NOT NULL,
	CONSTRAINT "draft_opening_generation_id_unique" UNIQUE("generation_id")
);
--> statement-breakpoint
CREATE TABLE "generation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"kind" text NOT NULL,
	"input" jsonb NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"attempt_id" uuid,
	"output" jsonb,
	"failure_code" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generation_state_shape" CHECK (
    ("generation"."state" = 'pending' AND "generation"."attempt_id" IS NULL AND "generation"."output" IS NULL AND "generation"."failure_code" IS NULL) OR
    ("generation"."state" IN ('running', 'uncertain') AND "generation"."attempt_id" IS NOT NULL AND "generation"."output" IS NULL AND "generation"."failure_code" IS NULL) OR
    ("generation"."state" = 'succeeded' AND "generation"."attempt_id" IS NOT NULL AND "generation"."output" IS NOT NULL AND "generation"."failure_code" IS NULL) OR
    ("generation"."state" = 'failed' AND "generation"."attempt_id" IS NOT NULL AND "generation"."output" IS NULL AND "generation"."failure_code" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "draft_opening" ADD CONSTRAINT "draft_opening_draft_id_story_draft_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."story_draft"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_opening" ADD CONSTRAINT "draft_opening_generation_id_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation" ADD CONSTRAINT "generation_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;