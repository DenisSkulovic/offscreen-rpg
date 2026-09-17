CREATE TABLE "story_resolution" (
	"generation_id" uuid PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"base_passage_id" uuid NOT NULL,
	"base_revision" integer NOT NULL,
	"operation_id" uuid NOT NULL,
	"submission" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_resolution_operation" UNIQUE("story_id","operation_id"),
	CONSTRAINT "story_resolution_base" UNIQUE("story_id","base_passage_id","base_revision"),
	CONSTRAINT "story_resolution_revision_positive" CHECK ("story_resolution"."base_revision" > 0)
);
--> statement-breakpoint
ALTER TABLE "story" ADD COLUMN "premise" jsonb;--> statement-breakpoint
ALTER TABLE "story_resolution" ADD CONSTRAINT "story_resolution_generation_id_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_resolution" ADD CONSTRAINT "story_resolution_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_resolution" ADD CONSTRAINT "story_resolution_base_passage_id_story_passage_id_fk" FOREIGN KEY ("base_passage_id") REFERENCES "public"."story_passage"("id") ON DELETE restrict ON UPDATE no action;