CREATE TABLE "storyteller_writer_mission" (
	"id" uuid PRIMARY KEY NOT NULL,
	"generation_id" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"capture_sha256" text NOT NULL,
	"library_root_hash" text NOT NULL,
	"library_root_revision" integer NOT NULL,
	"stage_root_hash" text,
	"stage_root_revision" integer,
	"next_revision" integer DEFAULT 1 NOT NULL,
	"state" text DEFAULT 'captured' NOT NULL,
	"budget_snapshot" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storyteller_writer_mission_state" CHECK ("storyteller_writer_mission"."state" IN ('captured','active','proposal-ready','held','failed','uncertain')),
	CONSTRAINT "storyteller_writer_mission_capture_sha" CHECK ("storyteller_writer_mission"."capture_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "storyteller_writer_mission_library_root_hash" CHECK ("storyteller_writer_mission"."library_root_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "storyteller_writer_mission_library_root_revision" CHECK ("storyteller_writer_mission"."library_root_revision" > 0),
	CONSTRAINT "storyteller_writer_mission_stage_root_pair" CHECK (("storyteller_writer_mission"."stage_root_hash" IS NULL) = ("storyteller_writer_mission"."stage_root_revision" IS NULL)),
	CONSTRAINT "storyteller_writer_mission_stage_root_hash" CHECK ("storyteller_writer_mission"."stage_root_hash" IS NULL OR "storyteller_writer_mission"."stage_root_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "storyteller_writer_mission_stage_root_revision" CHECK ("storyteller_writer_mission"."stage_root_revision" IS NULL OR "storyteller_writer_mission"."stage_root_revision" > 0),
	CONSTRAINT "storyteller_writer_mission_next_revision" CHECK ("storyteller_writer_mission"."next_revision" > 0),
	CONSTRAINT "storyteller_writer_mission_budget_snapshot_schema" CHECK (
		jsonb_typeof("storyteller_writer_mission"."budget_snapshot") = 'object'
		AND "storyteller_writer_mission"."budget_snapshot" ? 'maxModelRounds'
		AND "storyteller_writer_mission"."budget_snapshot" ? 'maxInputTokens'
		AND "storyteller_writer_mission"."budget_snapshot" ? 'maxGeneratedTokens'
		AND "storyteller_writer_mission"."budget_snapshot" ? 'maxMicrousd'
		AND "storyteller_writer_mission"."budget_snapshot" ? 'deadlineMs'
	)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "storyteller_writer_mission_generation" ON "storyteller_writer_mission" USING btree ("generation_id");
--> statement-breakpoint
CREATE INDEX "storyteller_writer_mission_story" ON "storyteller_writer_mission" USING btree ("story_id");
--> statement-breakpoint
ALTER TABLE "storyteller_writer_mission" ADD CONSTRAINT "storyteller_writer_mission_generation_id_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "storyteller_writer_mission" ADD CONSTRAINT "storyteller_writer_mission_operation_id_storyteller_operation_generation_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."storyteller_operation"("generation_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "storyteller_writer_step" (
	"mission_id" uuid NOT NULL,
	"context_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"attempt_id" uuid,
	"tool_call_id" text,
	"request_cas_hash" text NOT NULL,
	"result_cas_hash" text,
	"revision" integer NOT NULL,
	"state" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storyteller_writer_step_mission_context_ordinal" PRIMARY KEY("mission_id","context_id","ordinal"),
	CONSTRAINT "storyteller_writer_step_ordinal" CHECK ("storyteller_writer_step"."ordinal" > 0),
	CONSTRAINT "storyteller_writer_step_revision" CHECK ("storyteller_writer_step"."revision" > 0),
	CONSTRAINT "storyteller_writer_step_request_hash" CHECK ("storyteller_writer_step"."request_cas_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "storyteller_writer_step_result_hash" CHECK ("storyteller_writer_step"."result_cas_hash" IS NULL OR "storyteller_writer_step"."result_cas_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "storyteller_writer_step_tool_call_id" CHECK ("storyteller_writer_step"."tool_call_id" IS NULL OR "storyteller_writer_step"."tool_call_id" ~ '^t[1-9][0-9]*$'),
	CONSTRAINT "storyteller_writer_step_state" CHECK ("storyteller_writer_step"."state" IN (
		'captured',
		'model-request-prepared',
		'attempt-reserved',
		'dispatched',
		'result-settled',
		'tools-applied',
		'proposal-ready',
		'held',
		'failed',
		'uncertain'
	))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "storyteller_writer_step_attempt" ON "storyteller_writer_step" USING btree ("attempt_id") WHERE "storyteller_writer_step"."attempt_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "storyteller_writer_step_tool_call" ON "storyteller_writer_step" USING btree ("mission_id","context_id","tool_call_id") WHERE "storyteller_writer_step"."tool_call_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "storyteller_writer_step" ADD CONSTRAINT "storyteller_writer_step_mission_id_storyteller_writer_mission_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."storyteller_writer_mission"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "storyteller_writer_step" ADD CONSTRAINT "storyteller_writer_step_attempt_id_storyteller_attempt_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."storyteller_attempt"("id") ON DELETE restrict ON UPDATE no action;