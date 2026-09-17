CREATE TABLE "story_draft" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"premise" text NOT NULL,
	"storytelling_direction" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_draft_revision_positive" CHECK ("story_draft"."revision" > 0),
	CONSTRAINT "story_draft_content_bounds" CHECK (length("story_draft"."title") <= 160 AND length("story_draft"."premise") <= 6000 AND length("story_draft"."storytelling_direction") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "story_draft" ADD CONSTRAINT "story_draft_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "story_draft_owner_created_idx" ON "story_draft" USING btree ("owner_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);