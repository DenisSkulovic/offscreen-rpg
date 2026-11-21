CREATE TABLE "story_launch" (
	"owner_id" text NOT NULL,
	"operation_id" uuid NOT NULL,
	"request_hash" text NOT NULL,
	"request" jsonb NOT NULL,
	"reserved_story_id" uuid NOT NULL,
	"reserved_first_passage_id" uuid NOT NULL,
	"generation_id" uuid,
	"state" text DEFAULT 'pending' NOT NULL,
	"scene_sequence" integer,
	"public_reason" text,
	"uncertain_explanation" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_launch_pkey" PRIMARY KEY("owner_id","operation_id"),
	CONSTRAINT "story_launch_reserved_story_id_key" UNIQUE("reserved_story_id"),
	CONSTRAINT "story_launch_reserved_first_passage_id_key" UNIQUE("reserved_first_passage_id"),
	CONSTRAINT "story_launch_generation_id_key" UNIQUE("generation_id"),
	CONSTRAINT "story_launch_request_hash" CHECK ("story_launch"."request_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "story_launch_state" CHECK ("story_launch"."state" IN ('pending','preparing','composing','held','failed','uncertain','ready')),
	CONSTRAINT "story_launch_ready_shape" CHECK (
		("story_launch"."state" = 'ready' AND "story_launch"."scene_sequence" = 1 AND "story_launch"."generation_id" IS NOT NULL) OR
		("story_launch"."state" <> 'ready' AND "story_launch"."scene_sequence" IS NULL)
	),
	CONSTRAINT "story_launch_public_reason" CHECK (
		("story_launch"."state" = 'held' AND "story_launch"."public_reason" IN ('policy','authorization','capacity')) OR
		("story_launch"."state" = 'failed' AND "story_launch"."public_reason" IN ('rejected','not-admitted','unavailable')) OR
		("story_launch"."state" NOT IN ('held','failed') AND "story_launch"."public_reason" IS NULL)
	),
	CONSTRAINT "story_launch_uncertain_explanation" CHECK (
		("story_launch"."state" = 'uncertain' AND "story_launch"."uncertain_explanation" IS NOT NULL AND char_length("story_launch"."uncertain_explanation") BETWEEN 1 AND 500) OR
		("story_launch"."state" <> 'uncertain' AND "story_launch"."uncertain_explanation" IS NULL)
	)
);
--> statement-breakpoint
ALTER TABLE "story_launch" ADD CONSTRAINT "story_launch_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "story_launch" ADD CONSTRAINT "story_launch_generation_id_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE restrict ON UPDATE no action;