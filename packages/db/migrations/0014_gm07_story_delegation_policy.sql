CREATE TABLE "story_delegation_policy" (
	"story_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"version" integer NOT NULL,
	"allowed_class" text NOT NULL,
	"enabled" boolean NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_delegation_policy_pkey" PRIMARY KEY("story_id"),
	CONSTRAINT "story_delegation_policy_version" CHECK ("story_delegation_policy"."version" > 0),
	CONSTRAINT "story_delegation_policy_class" CHECK ("story_delegation_policy"."allowed_class" = 'decline-harmless-invitation.v1')
);
--> statement-breakpoint
CREATE TABLE "story_delegation_policy_command" (
	"story_id" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"request" jsonb NOT NULL,
	"result_version" integer NOT NULL,
	CONSTRAINT "story_delegation_policy_command_pkey" PRIMARY KEY("story_id","operation_id"),
	CONSTRAINT "story_delegation_policy_command_version" CHECK ("story_delegation_policy_command"."result_version" > 0)
);
--> statement-breakpoint
ALTER TABLE "story_delegation_policy" ADD CONSTRAINT "story_delegation_policy_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "story_delegation_policy" ADD CONSTRAINT "story_delegation_policy_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "story_delegation_policy_command" ADD CONSTRAINT "story_delegation_policy_command_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;