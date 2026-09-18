CREATE TABLE "campaign" (
	"story_id" uuid PRIMARY KEY NOT NULL,
	"settings_revision" integer NOT NULL,
	"locked" integer DEFAULT 0 NOT NULL,
	"character" jsonb,
	"location" text,
	"game_time_ms" bigint NOT NULL,
	"offer" jsonb,
	"active_activity_id" uuid
);
--> statement-breakpoint
CREATE TABLE "campaign_command" (
	"story_id" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"request" jsonb NOT NULL,
	CONSTRAINT "campaign_command_story_id_operation_id_pk" PRIMARY KEY("story_id","operation_id")
);
--> statement-breakpoint
CREATE TABLE "campaign_settings" (
	"story_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"settings" jsonb NOT NULL,
	"profile" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_settings_story_id_revision_pk" PRIMARY KEY("story_id","revision")
);
--> statement-breakpoint
CREATE TABLE "game_activity" (
	"id" uuid PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"plan" jsonb NOT NULL,
	"state" text NOT NULL,
	"completed" integer DEFAULT 0 NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"elapsed_ms" bigint NOT NULL,
	"anchor_at" timestamp (3) with time zone NOT NULL,
	"pace" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_roll" (
	"id" uuid PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"segment" integer NOT NULL,
	"check_key" text NOT NULL,
	"game_time_ms" bigint NOT NULL,
	"plan" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"coins" integer NOT NULL,
	CONSTRAINT "game_roll_once" UNIQUE("operation_id","segment","check_key")
);
--> statement-breakpoint
CREATE TABLE "storyteller_preset" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"creative" jsonb NOT NULL,
	"profile" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_command" ADD CONSTRAINT "campaign_command_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_settings" ADD CONSTRAINT "campaign_settings_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_activity" ADD CONSTRAINT "game_activity_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_roll" ADD CONSTRAINT "game_roll_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyteller_preset" ADD CONSTRAINT "storyteller_preset_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;