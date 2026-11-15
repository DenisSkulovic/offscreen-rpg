CREATE TABLE "story_viewer_visit" (
	"story_id" uuid NOT NULL,
	"viewer_id" text NOT NULL,
	"acknowledged_event_sequence" bigint DEFAULT 0 NOT NULL,
	"acknowledged_at" timestamp (3) with time zone NOT NULL,
	"updated_at" timestamp (3) with time zone NOT NULL,
	CONSTRAINT "story_viewer_visit_pkey" PRIMARY KEY("story_id","viewer_id"),
	CONSTRAINT "story_viewer_visit_sequence" CHECK ("story_viewer_visit"."acknowledged_event_sequence" >= 0)
);
--> statement-breakpoint
ALTER TABLE "story_viewer_visit" ADD CONSTRAINT "story_viewer_visit_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "story_viewer_visit" ADD CONSTRAINT "story_viewer_visit_viewer_id_user_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "story_viewer_visit_open" (
	"visit_token" uuid PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"viewer_id" text NOT NULL,
	"previous_sequence" bigint,
	"frontier" bigint NOT NULL,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_viewer_visit_open_frontier" CHECK ("story_viewer_visit_open"."frontier" >= 0),
	CONSTRAINT "story_viewer_visit_open_previous" CHECK ("story_viewer_visit_open"."previous_sequence" IS NULL OR "story_viewer_visit_open"."previous_sequence" >= 0)
);
--> statement-breakpoint
ALTER TABLE "story_viewer_visit_open" ADD CONSTRAINT "story_viewer_visit_open_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "story_viewer_visit_open" ADD CONSTRAINT "story_viewer_visit_open_viewer_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "story_viewer_visit_open_story_viewer" ON "story_viewer_visit_open" USING btree ("story_id","viewer_id");
--> statement-breakpoint
CREATE TABLE "story_viewer_visit_ack" (
	"ack_id" uuid PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"viewer_id" text NOT NULL,
	"visit_token" uuid NOT NULL,
	"frontier" bigint NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_viewer_visit_ack_frontier" CHECK ("story_viewer_visit_ack"."frontier" >= 0)
);
--> statement-breakpoint
ALTER TABLE "story_viewer_visit_ack" ADD CONSTRAINT "story_viewer_visit_ack_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "story_viewer_visit_ack" ADD CONSTRAINT "story_viewer_visit_ack_viewer_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "story_viewer_visit_ack_token" ON "story_viewer_visit_ack" USING btree ("visit_token");
