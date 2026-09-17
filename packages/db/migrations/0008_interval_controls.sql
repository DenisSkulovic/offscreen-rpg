CREATE TABLE "story_control" (
	"story_id" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"request" jsonb NOT NULL,
	CONSTRAINT "story_control_identity" UNIQUE("story_id","operation_id")
);
--> statement-breakpoint
ALTER TABLE "story" ADD COLUMN "view_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "story_passage" ADD COLUMN "interval_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "story_passage" ADD COLUMN "control_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "story_passage" ADD COLUMN "remaining_ms" integer;--> statement-breakpoint
ALTER TABLE "story_control" ADD CONSTRAINT "story_control_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_passage" ADD CONSTRAINT "story_passage_control_valid" CHECK ("story_passage"."control_revision" >= 0 AND "story_passage"."interval_version" IN (0, 1) AND ("story_passage"."remaining_ms" IS NULL OR ("story_passage"."remaining_ms" >= 0 AND "story_passage"."wait_plan" IS NOT NULL AND "story_passage"."interval_version" = 1)));
--> statement-breakpoint
UPDATE "story" SET "view_version" = "revision";
