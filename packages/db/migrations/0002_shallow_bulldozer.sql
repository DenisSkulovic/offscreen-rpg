CREATE TABLE "game_activity_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ordinal" bigserial NOT NULL,
	"story_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"activity_revision" integer NOT NULL,
	"tick" bigint NOT NULL,
	"kind" text NOT NULL,
	"cause_key" text NOT NULL,
	"label" text NOT NULL,
	"summary" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_activity_event_cause" UNIQUE("activity_id","cause_key","kind")
);
--> statement-breakpoint
ALTER TABLE "game_activity_event" ADD CONSTRAINT "game_activity_event_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_activity_event" ADD CONSTRAINT "game_activity_event_activity_id_game_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."game_activity"("id") ON DELETE no action ON UPDATE no action;