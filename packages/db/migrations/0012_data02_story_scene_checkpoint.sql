CREATE TABLE "story_scene_checkpoint" (
	"story_id" uuid NOT NULL,
	"scene_sequence" integer NOT NULL,
	"passage_id" uuid NOT NULL,
	"transition_id" uuid,
	"operation_id" uuid NOT NULL,
	"checkpoint_hash" text NOT NULL,
	"canon_root_hash" text,
	"canon_root_revision" integer NOT NULL,
	"state_schema_version" integer NOT NULL,
	"pins" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_scene_checkpoint_pkey" PRIMARY KEY("story_id","scene_sequence"),
	CONSTRAINT "story_scene_checkpoint_passage" UNIQUE("passage_id"),
	CONSTRAINT "story_scene_checkpoint_operation" UNIQUE("story_id","operation_id"),
	CONSTRAINT "story_scene_checkpoint_transition" UNIQUE("story_id","transition_id"),
	CONSTRAINT "story_scene_checkpoint_sequence" CHECK ("story_scene_checkpoint"."scene_sequence" > 0),
	CONSTRAINT "story_scene_checkpoint_hash" CHECK ("story_scene_checkpoint"."checkpoint_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "story_scene_checkpoint_canon" CHECK (("story_scene_checkpoint"."canon_root_hash" IS NULL AND "story_scene_checkpoint"."canon_root_revision" = 0) OR ("story_scene_checkpoint"."canon_root_hash" ~ '^[0-9a-f]{64}$' AND "story_scene_checkpoint"."canon_root_revision" > 0)),
	CONSTRAINT "story_scene_checkpoint_schema" CHECK ("story_scene_checkpoint"."state_schema_version" = 1),
	CONSTRAINT "story_scene_checkpoint_opening" CHECK (("story_scene_checkpoint"."scene_sequence" = 1 AND "story_scene_checkpoint"."transition_id" IS NULL) OR ("story_scene_checkpoint"."scene_sequence" > 1 AND "story_scene_checkpoint"."transition_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "story_scene_checkpoint" ADD CONSTRAINT "story_scene_checkpoint_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "story_scene_checkpoint" ADD CONSTRAINT "story_scene_checkpoint_passage_id_story_passage_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."story_passage"("id") ON DELETE restrict ON UPDATE no action;
