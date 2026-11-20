CREATE TABLE "campaign_delegated_offer" (
	"offer_id" uuid PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"narrative_revision" integer NOT NULL,
	"owner_id" text NOT NULL,
	"fallback_action_key" text NOT NULL,
	"fallback_path" text NOT NULL,
	"source_fingerprint" text NOT NULL,
	"captured_policy_version" integer NOT NULL,
	"published_at" timestamp (3) with time zone NOT NULL,
	"due_at" timestamp (3) with time zone NOT NULL,
	"status" text NOT NULL,
	"control_revision" integer DEFAULT 0 NOT NULL,
	"remaining_ms" integer,
	"wake_epoch" integer NOT NULL,
	"action_operation_id" uuid NOT NULL,
	"wake_operation_id" uuid NOT NULL,
	"selected_at" timestamp (3) with time zone,
	"selection_source" text,
	CONSTRAINT "campaign_delegated_offer_action_operation" UNIQUE("action_operation_id"),
	CONSTRAINT "campaign_delegated_offer_wake_operation" UNIQUE("wake_operation_id"),
	CONSTRAINT "campaign_delegated_offer_status" CHECK ("campaign_delegated_offer"."status" in ('armed', 'paused', 'revoked', 'held', 'admitted', 'consumed')),
	CONSTRAINT "campaign_delegated_offer_control_revision" CHECK ("campaign_delegated_offer"."control_revision" >= 0),
	CONSTRAINT "campaign_delegated_offer_wake_epoch" CHECK ("campaign_delegated_offer"."wake_epoch" >= 1),
	CONSTRAINT "campaign_delegated_offer_policy_version" CHECK ("campaign_delegated_offer"."captured_policy_version" > 0),
	CONSTRAINT "campaign_delegated_offer_remaining_ms" CHECK (("campaign_delegated_offer"."status" = 'paused' AND "campaign_delegated_offer"."remaining_ms" IS NOT NULL AND "campaign_delegated_offer"."remaining_ms" >= 0) OR ("campaign_delegated_offer"."status" <> 'paused' AND "campaign_delegated_offer"."remaining_ms" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "campaign_delegated_offer" ADD CONSTRAINT "campaign_delegated_offer_offer_id_game_offer_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."game_offer"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "campaign_delegated_offer" ADD CONSTRAINT "campaign_delegated_offer_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "campaign_delegated_offer" ADD CONSTRAINT "campaign_delegated_offer_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;