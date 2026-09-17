ALTER TABLE "story_passage" ADD COLUMN "wait_plan" jsonb;--> statement-breakpoint
ALTER TABLE "story_passage" ADD COLUMN "due_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "story_passage" ADD CONSTRAINT "story_passage_wait_pair" CHECK (("story_passage"."wait_plan" IS NULL) = ("story_passage"."due_at" IS NULL));