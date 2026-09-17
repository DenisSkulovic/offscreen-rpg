CREATE TABLE "story_item" (
	"story_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"holder_key" text NOT NULL,
	CONSTRAINT "story_item_identity" UNIQUE("story_id","key")
);
--> statement-breakpoint
ALTER TABLE "story_passage" ADD COLUMN "initial_items" jsonb;--> statement-breakpoint
ALTER TABLE "story_passage" ADD COLUMN "effects" jsonb;--> statement-breakpoint
ALTER TABLE "story_item" ADD CONSTRAINT "story_item_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE restrict ON UPDATE no action;