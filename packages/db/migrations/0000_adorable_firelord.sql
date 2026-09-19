CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign" (
	"story_id" uuid PRIMARY KEY NOT NULL,
	"settings_revision" integer NOT NULL,
	"locked" integer DEFAULT 0 NOT NULL,
	"character" jsonb,
	"story_facts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"activity_occurrences" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"accepted_activity_plan" jsonb,
	"content" jsonb,
	"location" text,
	"tick" bigint NOT NULL,
	"clock" jsonb NOT NULL,
	"clock_anchor_at" timestamp (3) with time zone NOT NULL,
	"clock_pace" jsonb NOT NULL,
	"offer" jsonb,
	"situation_authorization" jsonb NOT NULL,
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
CREATE TABLE "campaign_consequence" (
	"operation_id" uuid PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"passage_id" uuid NOT NULL,
	"base_revision" integer NOT NULL,
	"receipt" jsonb NOT NULL,
	"generation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_consequence_base" UNIQUE("story_id","base_revision")
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
CREATE TABLE "game_action_receipt" (
	"operation_id" uuid PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"offer_id" uuid NOT NULL,
	"action_key" text NOT NULL,
	"base_revision" integer NOT NULL,
	"offer" jsonb NOT NULL,
	"plan" jsonb NOT NULL,
	"label" text NOT NULL,
	"intention" text NOT NULL,
	"outcome" text NOT NULL,
	"outcome_text" text NOT NULL,
	"effects" jsonb NOT NULL,
	"declarations" jsonb NOT NULL,
	"roll" jsonb,
	"generation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_action_receipt_offer" UNIQUE("story_id","offer_id")
);
--> statement-breakpoint
CREATE TABLE "game_activity" (
	"id" uuid PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"plan" jsonb NOT NULL,
	"state" text NOT NULL,
	"boundaries_settled" integer DEFAULT 0 NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"progress" jsonb NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "game_activity_report" (
	"id" uuid PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"activity_revision" integer NOT NULL,
	"source_passage_id" uuid NOT NULL,
	"source_revision" integer NOT NULL,
	"source_tick" bigint NOT NULL,
	"label" text NOT NULL,
	"factual_summary" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"generation_id" uuid,
	"report" jsonb,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp (3) with time zone,
	CONSTRAINT "game_activity_report_generation_id_unique" UNIQUE("generation_id"),
	CONSTRAINT "game_activity_report_hook" UNIQUE("activity_id","activity_revision")
);
--> statement-breakpoint
CREATE TABLE "game_offer" (
	"id" uuid PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"narrative_revision" integer NOT NULL,
	"plans" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_offer_story_identity" UNIQUE("story_id","id")
);
--> statement-breakpoint
CREATE TABLE "game_roll" (
	"id" uuid PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"segment" integer NOT NULL,
	"check_key" text NOT NULL,
	"tick" bigint NOT NULL,
	"plan" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"effects" jsonb NOT NULL,
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
CREATE TABLE "story_draft" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"storyteller" jsonb,
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
CREATE TABLE "draft_opening" (
	"draft_id" uuid PRIMARY KEY NOT NULL,
	"generation_id" uuid NOT NULL,
	CONSTRAINT "draft_opening_generation_id_unique" UNIQUE("generation_id")
);
--> statement-breakpoint
CREATE TABLE "generation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"kind" text NOT NULL,
	"status_revision" integer DEFAULT 0 NOT NULL,
	"input" jsonb NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"attempt_id" uuid,
	"output" jsonb,
	"failure_code" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generation_state_shape" CHECK (
    ("generation"."state" = 'pending' AND "generation"."attempt_id" IS NULL AND "generation"."output" IS NULL AND "generation"."failure_code" IS NULL) OR
    ("generation"."state" IN ('running', 'uncertain') AND "generation"."attempt_id" IS NOT NULL AND "generation"."output" IS NULL AND "generation"."failure_code" IS NULL) OR
    ("generation"."state" = 'succeeded' AND "generation"."attempt_id" IS NOT NULL AND "generation"."output" IS NOT NULL AND "generation"."failure_code" IS NULL) OR
    ("generation"."state" = 'failed' AND "generation"."attempt_id" IS NOT NULL AND "generation"."output" IS NULL AND "generation"."failure_code" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" uuid PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"operation_id" uuid NOT NULL,
	"available_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"lease_id" uuid,
	"delivered_at" timestamp (3) with time zone,
	CONSTRAINT "outbox_delivered_shape" CHECK ("outbox"."delivered_at" IS NULL OR "outbox"."lease_id" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "qa_run" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"case_id" text NOT NULL,
	"case_version" integer NOT NULL,
	"case_definition" jsonb NOT NULL,
	"variant_id" text,
	"driver" text NOT NULL,
	"state" text DEFAULT 'open' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"git_commit" text NOT NULL,
	"git_dirty" boolean NOT NULL,
	"environment" jsonb NOT NULL,
	"setup" jsonb NOT NULL,
	"execution" jsonb NOT NULL,
	"accounting" jsonb NOT NULL,
	"disposition" text,
	"operator_notes" text,
	"started_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"finalized_at" timestamp (3) with time zone,
	CONSTRAINT "qa_run_case_version_positive" CHECK ("qa_run"."case_version" > 0),
	CONSTRAINT "qa_run_revision_positive" CHECK ("qa_run"."revision" > 0),
	CONSTRAINT "qa_run_state_shape" CHECK (("qa_run"."state" = 'open' AND "qa_run"."disposition" IS NULL AND "qa_run"."operator_notes" IS NULL AND "qa_run"."finalized_at" IS NULL) OR ("qa_run"."state" = 'finalized' AND "qa_run"."disposition" IS NOT NULL AND "qa_run"."operator_notes" IS NOT NULL AND "qa_run"."finalized_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "qa_run_stage" (
	"run_id" uuid NOT NULL,
	"stage_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"status" text NOT NULL,
	"observation" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"ratings" jsonb NOT NULL,
	"recorded_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qa_run_stage_run_id_stage_id_pk" PRIMARY KEY("run_id","stage_id"),
	CONSTRAINT "qa_run_stage_ordinal" UNIQUE("run_id","ordinal"),
	CONSTRAINT "qa_run_stage_ordinal_nonnegative" CHECK ("qa_run_stage"."ordinal" >= 0),
	CONSTRAINT "qa_run_stage_status_valid" CHECK ("qa_run_stage"."status" IN ('passed', 'failed', 'blocked', 'skipped'))
);
--> statement-breakpoint
CREATE TABLE "story" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"source" text NOT NULL,
	"premise" jsonb,
	"storyteller" jsonb,
	"execution" jsonb,
	"usage_policy" jsonb,
	"continuity_notes" jsonb,
	"revision" integer DEFAULT 1 NOT NULL,
	"view_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_revision_positive" CHECK ("story"."revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "story_control" (
	"story_id" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"request" jsonb NOT NULL,
	CONSTRAINT "story_control_identity" UNIQUE("story_id","operation_id")
);
--> statement-breakpoint
CREATE TABLE "story_item" (
	"story_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"holder_key" text NOT NULL,
	CONSTRAINT "story_item_identity" UNIQUE("story_id","key")
);
--> statement-breakpoint
CREATE TABLE "story_passage" (
	"id" uuid PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"transition_id" uuid,
	"response" jsonb,
	"initial_items" jsonb,
	"effects" jsonb,
	"response_source" text,
	"decision_plan" jsonb,
	"response_due_at" timestamp (3) with time zone,
	"wait_plan" jsonb,
	"due_at" timestamp (3) with time zone,
	"control_revision" integer DEFAULT 0 NOT NULL,
	"remaining_ms" integer,
	"content" jsonb NOT NULL,
	"interaction" jsonb,
	"source_generation_id" uuid,
	"source_generation_part" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_passage_sequence" UNIQUE("story_id","sequence"),
	CONSTRAINT "story_passage_transition" UNIQUE("story_id","transition_id"),
	CONSTRAINT "story_passage_decision_valid" CHECK (("story_passage"."decision_plan" IS NULL) = ("story_passage"."response_due_at" IS NULL) AND ("story_passage"."decision_plan" IS NULL OR ("story_passage"."interaction" IS NOT NULL AND "story_passage"."wait_plan" IS NULL))),
	CONSTRAINT "story_passage_response_source_valid" CHECK ("story_passage"."response_source" IS NULL OR ("story_passage"."response" IS NOT NULL AND "story_passage"."response_source" IN ('player', 'default'))),
	CONSTRAINT "story_passage_sequence_positive" CHECK ("story_passage"."sequence" > 0),
	CONSTRAINT "story_passage_control_valid" CHECK ("story_passage"."control_revision" >= 0 AND ("story_passage"."remaining_ms" IS NULL OR ("story_passage"."remaining_ms" >= 0 AND "story_passage"."wait_plan" IS NOT NULL))),
	CONSTRAINT "story_passage_wait_pair" CHECK (("story_passage"."wait_plan" IS NULL) = ("story_passage"."due_at" IS NULL)),
	CONSTRAINT "story_passage_generation_part" CHECK (("story_passage"."source_generation_id" IS NULL AND "story_passage"."source_generation_part" IS NULL) OR ("story_passage"."source_generation_id" IS NOT NULL AND "story_passage"."source_generation_part" IN ('current', 'arrival')))
);
--> statement-breakpoint
CREATE TABLE "story_resolution" (
	"generation_id" uuid PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"base_passage_id" uuid NOT NULL,
	"base_revision" integer NOT NULL,
	"operation_id" uuid NOT NULL,
	"submission" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_resolution_operation" UNIQUE("story_id","operation_id"),
	CONSTRAINT "story_resolution_base" UNIQUE("story_id","base_passage_id","base_revision"),
	CONSTRAINT "story_resolution_revision_positive" CHECK ("story_resolution"."base_revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "storyteller_attempt" (
	"id" uuid PRIMARY KEY NOT NULL,
	"generation_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"story_id" uuid,
	"draft_id" uuid,
	"purpose" text NOT NULL,
	"storyteller_profile_id" text NOT NULL,
	"storyteller_profile_revision" integer NOT NULL,
	"task_input_version" integer NOT NULL,
	"prompt_version" text NOT NULL,
	"recipe_version" text NOT NULL,
	"resource_policy_version" text NOT NULL,
	"requested_model" text NOT NULL,
	"requested_provider" text NOT NULL,
	"price_version" text NOT NULL,
	"attribution" jsonb NOT NULL,
	"state" text NOT NULL,
	"reserved_microusd" bigint NOT NULL,
	"estimated_microusd" bigint NOT NULL,
	"estimated_input_tokens" integer NOT NULL,
	"estimation_method" text NOT NULL,
	"charged_microusd" bigint,
	"calculated_microusd" bigint,
	"reconciliation" text NOT NULL,
	"request_bytes" integer NOT NULL,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"reasoning_tokens" integer,
	"cached_tokens" integer,
	"cache_write_tokens" integer,
	"total_tokens" integer,
	"policy" jsonb NOT NULL,
	"provider_id" text,
	"reported_model" text,
	"finish_reason" text,
	"http_status" integer,
	"duration_ms" integer,
	"dispatched_at" timestamp (3) with time zone,
	"settled_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storyteller_attempt_state" CHECK ("storyteller_attempt"."state" IN ('reserved','dispatched','settled','uncertain','unsent')),
	CONSTRAINT "storyteller_attempt_settlement" CHECK (("storyteller_attempt"."state" IN ('settled','unsent')) = ("storyteller_attempt"."charged_microusd" IS NOT NULL)),
	CONSTRAINT "storyteller_attempt_amounts" CHECK ("storyteller_attempt"."reserved_microusd" >= 0 AND "storyteller_attempt"."estimated_microusd" >= 0 AND "storyteller_attempt"."estimated_input_tokens" >= 0 AND ("storyteller_attempt"."charged_microusd" IS NULL OR "storyteller_attempt"."charged_microusd" >= 0) AND ("storyteller_attempt"."calculated_microusd" IS NULL OR "storyteller_attempt"."calculated_microusd" >= 0)),
	CONSTRAINT "storyteller_attempt_reconciliation" CHECK (
        ("storyteller_attempt"."state" IN ('reserved','dispatched') AND "storyteller_attempt"."reconciliation" = 'pending' AND "storyteller_attempt"."calculated_microusd" IS NULL AND "storyteller_attempt"."settled_at" IS NULL) OR
        ("storyteller_attempt"."state" = 'uncertain' AND "storyteller_attempt"."reconciliation" = 'unknown' AND "storyteller_attempt"."calculated_microusd" IS NULL AND "storyteller_attempt"."dispatched_at" IS NOT NULL AND "storyteller_attempt"."settled_at" IS NULL) OR
        ("storyteller_attempt"."state" = 'unsent' AND "storyteller_attempt"."reconciliation" = 'unavailable' AND "storyteller_attempt"."calculated_microusd" IS NULL AND "storyteller_attempt"."dispatched_at" IS NULL AND "storyteller_attempt"."settled_at" IS NOT NULL) OR
        ("storyteller_attempt"."state" = 'settled' AND "storyteller_attempt"."reconciliation" IN ('matched','different') AND "storyteller_attempt"."calculated_microusd" IS NOT NULL AND "storyteller_attempt"."dispatched_at" IS NOT NULL AND "storyteller_attempt"."settled_at" IS NOT NULL) OR
        ("storyteller_attempt"."state" = 'settled' AND "storyteller_attempt"."reconciliation" = 'unavailable' AND "storyteller_attempt"."calculated_microusd" IS NULL AND "storyteller_attempt"."dispatched_at" IS NOT NULL AND "storyteller_attempt"."settled_at" IS NOT NULL)
      ),
	CONSTRAINT "storyteller_attempt_metrics" CHECK ("storyteller_attempt"."request_bytes" >= 0 AND ("storyteller_attempt"."prompt_tokens" IS NULL OR "storyteller_attempt"."prompt_tokens" >= 0) AND ("storyteller_attempt"."completion_tokens" IS NULL OR "storyteller_attempt"."completion_tokens" >= 0) AND ("storyteller_attempt"."reasoning_tokens" IS NULL OR "storyteller_attempt"."reasoning_tokens" >= 0) AND ("storyteller_attempt"."cached_tokens" IS NULL OR "storyteller_attempt"."cached_tokens" >= 0) AND ("storyteller_attempt"."cache_write_tokens" IS NULL OR "storyteller_attempt"."cache_write_tokens" >= 0) AND ("storyteller_attempt"."total_tokens" IS NULL OR "storyteller_attempt"."total_tokens" >= 0) AND ("storyteller_attempt"."duration_ms" IS NULL OR "storyteller_attempt"."duration_ms" >= 0))
);
--> statement-breakpoint
CREATE TABLE "storyteller_funding" (
	"id" uuid PRIMARY KEY NOT NULL,
	"limit_microusd" bigint NOT NULL,
	"settled_microusd" bigint DEFAULT 0 NOT NULL,
	"reserved_microusd" bigint DEFAULT 0 NOT NULL,
	"stopped" boolean DEFAULT true NOT NULL,
	"verified_at" timestamp (3) with time zone NOT NULL,
	CONSTRAINT "storyteller_funding_nonnegative" CHECK ("storyteller_funding"."limit_microusd" >= 0 AND "storyteller_funding"."settled_microusd" >= 0 AND "storyteller_funding"."reserved_microusd" >= 0)
);
--> statement-breakpoint
CREATE TABLE "storyteller_publication" (
	"generation_id" uuid PRIMARY KEY NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"failure_code" text,
	CONSTRAINT "storyteller_publication_state" CHECK ("storyteller_publication"."state" IN ('pending','published','stale','blocked'))
);
--> statement-breakpoint
CREATE TABLE "storyteller_retry" (
	"generation_id" uuid NOT NULL,
	"retry_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL,
	CONSTRAINT "storyteller_retry_identity" UNIQUE("generation_id","retry_id")
);
--> statement-breakpoint
CREATE TABLE "storyteller_run" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"limit_microusd" bigint NOT NULL,
	"settled_microusd" bigint DEFAULT 0 NOT NULL,
	"reserved_microusd" bigint DEFAULT 0 NOT NULL,
	"max_attempts" integer NOT NULL,
	"admitted_attempts" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "storyteller_run_bounds" CHECK ("storyteller_run"."limit_microusd" >= 0 AND "storyteller_run"."settled_microusd" >= 0 AND "storyteller_run"."reserved_microusd" >= 0 AND "storyteller_run"."max_attempts" > 0 AND "storyteller_run"."admitted_attempts" BETWEEN 0 AND "storyteller_run"."max_attempts")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_command" ADD CONSTRAINT "campaign_command_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_consequence" ADD CONSTRAINT "campaign_consequence_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_settings" ADD CONSTRAINT "campaign_settings_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_action_receipt" ADD CONSTRAINT "game_action_receipt_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_activity" ADD CONSTRAINT "game_activity_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_activity_event" ADD CONSTRAINT "game_activity_event_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_activity_event" ADD CONSTRAINT "game_activity_event_activity_id_game_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."game_activity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_activity_report" ADD CONSTRAINT "game_activity_report_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_activity_report" ADD CONSTRAINT "game_activity_report_activity_id_game_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."game_activity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_activity_report" ADD CONSTRAINT "game_activity_report_source_passage_id_story_passage_id_fk" FOREIGN KEY ("source_passage_id") REFERENCES "public"."story_passage"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_activity_report" ADD CONSTRAINT "game_activity_report_generation_id_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_offer" ADD CONSTRAINT "game_offer_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_roll" ADD CONSTRAINT "game_roll_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyteller_preset" ADD CONSTRAINT "storyteller_preset_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_draft" ADD CONSTRAINT "story_draft_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_opening" ADD CONSTRAINT "draft_opening_draft_id_story_draft_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."story_draft"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_opening" ADD CONSTRAINT "draft_opening_generation_id_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation" ADD CONSTRAINT "generation_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_run" ADD CONSTRAINT "qa_run_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_run_stage" ADD CONSTRAINT "qa_run_stage_run_id_qa_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."qa_run"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story" ADD CONSTRAINT "story_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_control" ADD CONSTRAINT "story_control_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_item" ADD CONSTRAINT "story_item_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_passage" ADD CONSTRAINT "story_passage_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_passage" ADD CONSTRAINT "story_passage_source_generation_id_generation_id_fk" FOREIGN KEY ("source_generation_id") REFERENCES "public"."generation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_resolution" ADD CONSTRAINT "story_resolution_generation_id_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_resolution" ADD CONSTRAINT "story_resolution_story_id_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."story"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_resolution" ADD CONSTRAINT "story_resolution_base_passage_id_story_passage_id_fk" FOREIGN KEY ("base_passage_id") REFERENCES "public"."story_passage"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyteller_attempt" ADD CONSTRAINT "storyteller_attempt_generation_id_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyteller_attempt" ADD CONSTRAINT "storyteller_attempt_account_id_storyteller_funding_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."storyteller_funding"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyteller_attempt" ADD CONSTRAINT "storyteller_attempt_run_id_storyteller_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."storyteller_run"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyteller_publication" ADD CONSTRAINT "storyteller_publication_generation_id_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyteller_retry" ADD CONSTRAINT "storyteller_retry_generation_id_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyteller_run" ADD CONSTRAINT "storyteller_run_account_id_storyteller_funding_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."storyteller_funding"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_identity_unique" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "story_draft_owner_created_idx" ON "story_draft" USING btree ("owner_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "outbox_pending" ON "outbox" USING btree ("available_at","id") WHERE "outbox"."delivered_at" IS NULL;--> statement-breakpoint
CREATE INDEX "storyteller_attempt_account_created" ON "storyteller_attempt" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE INDEX "storyteller_attempt_story_created" ON "storyteller_attempt" USING btree ("story_id","created_at");--> statement-breakpoint
CREATE INDEX "storyteller_attempt_purpose_created" ON "storyteller_attempt" USING btree ("purpose","created_at");