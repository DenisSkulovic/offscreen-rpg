CREATE TABLE "story" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"source" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_revision_positive" CHECK ("story"."revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "story_passage" (
	"id" uuid PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"content" jsonb NOT NULL,
	"interaction" jsonb,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_passage_sequence" UNIQUE("story_id","sequence"),
	CONSTRAINT "story_passage_sequence_positive" CHECK ("story_passage"."sequence" > 0)
);
--> statement-breakpoint
ALTER TABLE "story" ADD CONSTRAINT "story_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_passage" ADD CONSTRAINT "story_passage_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE restrict ON UPDATE no action;