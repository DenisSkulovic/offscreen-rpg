CREATE TABLE "story_public_inspect_target" (
	"story_id" uuid NOT NULL,
	"handle" text NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "story_public_inspect_target_pkey" PRIMARY KEY("story_id","handle"),
	CONSTRAINT "story_public_inspect_target_handle" CHECK (char_length("handle") BETWEEN 1 AND 80),
	CONSTRAINT "story_public_inspect_target_label" CHECK (char_length("label") BETWEEN 1 AND 120)
);
--> statement-breakpoint
ALTER TABLE "story_public_inspect_target" ADD CONSTRAINT "story_public_inspect_target_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "custom_intent_candidate" (
	"candidate_id" uuid PRIMARY KEY NOT NULL,
	"interpret_operation_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"viewer_id" text NOT NULL,
	"request_digest" text NOT NULL,
	"status" text NOT NULL,
	"input_text" text NOT NULL,
	"response" jsonb NOT NULL,
	"passage_id" uuid NOT NULL,
	"narrative_revision" integer NOT NULL,
	"settings_revision" integer NOT NULL,
	"clarification_used" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "custom_intent_candidate_status" CHECK ("status" in ('reviewable', 'clarify', 'rejected', 'unsupported')),
	CONSTRAINT "custom_intent_candidate_revision" CHECK ("narrative_revision" > 0),
	CONSTRAINT "custom_intent_candidate_settings" CHECK ("settings_revision" > 0),
	CONSTRAINT "custom_intent_candidate_text" CHECK (char_length("input_text") BETWEEN 1 AND 240)
);
--> statement-breakpoint
ALTER TABLE "custom_intent_candidate" ADD CONSTRAINT "custom_intent_candidate_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "custom_intent_candidate" ADD CONSTRAINT "custom_intent_candidate_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "custom_intent_candidate" ADD CONSTRAINT "custom_intent_candidate_viewer_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "custom_intent_candidate_operation" ON "custom_intent_candidate" USING btree ("story_id","interpret_operation_id");
--> statement-breakpoint
CREATE INDEX "custom_intent_candidate_rate" ON "custom_intent_candidate" USING btree ("viewer_id","story_id","created_at");
