CREATE TABLE "story_public_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"event_sequence" bigint NOT NULL,
	"kind" text NOT NULL,
	"game_second" bigint,
	"title" text NOT NULL,
	"summary" text,
	"source_kind" text NOT NULL,
	"source_id" uuid NOT NULL,
	"passage_id" uuid,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_public_event_sequence" UNIQUE("story_id","event_sequence"),
	CONSTRAINT "story_public_event_source" UNIQUE("story_id","source_kind","source_id"),
	CONSTRAINT "story_public_event_kind" CHECK ("story_public_event"."kind" in ('passage-published', 'action-settled', 'action-interrupted', 'activity-development', 'world-development')),
	CONSTRAINT "story_public_event_source_kind" CHECK ("story_public_event"."source_kind" in ('passage', 'action-execution', 'activity-event', 'world-obligation')),
	CONSTRAINT "story_public_event_title" CHECK (char_length("story_public_event"."title") >= 1 AND char_length("story_public_event"."title") <= 200),
	CONSTRAINT "story_public_event_summary" CHECK ("story_public_event"."summary" IS NULL OR (char_length("story_public_event"."summary") >= 1 AND char_length("story_public_event"."summary") <= 500)),
	CONSTRAINT "story_public_event_sequence_positive" CHECK ("story_public_event"."event_sequence" > 0)
);
--> statement-breakpoint
ALTER TABLE "story_public_event" ADD CONSTRAINT "story_public_event_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;