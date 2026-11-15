CREATE TABLE "storyteller_execution_stage" (
	"id" uuid PRIMARY KEY NOT NULL,
	"generation_id" uuid NOT NULL,
	"operation_id" uuid,
	"attempt_id" uuid,
	"stage" text NOT NULL,
	"outcome" text NOT NULL,
	"source_kind" text NOT NULL,
	"source_id" text,
	"source_sha256" text,
	"failure_class" text,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"producer_build_id" text NOT NULL,
	CONSTRAINT "storyteller_execution_stage_stage" CHECK ("storyteller_execution_stage"."stage" IN ('cause-captured','context-materialization-started','context-materialization-completed','task-prepared','dispatch-review-prepared','provider-dispatch-possible','model-response-recorded','validation-settled','publication-decided','stage-held','stage-skipped','stage-failed')),
	CONSTRAINT "storyteller_execution_stage_outcome" CHECK ("storyteller_execution_stage"."outcome" IN ('completed','failed','held','stale','uncertain','not-run')),
	CONSTRAINT "storyteller_execution_stage_source_kind" CHECK ("storyteller_execution_stage"."source_kind" IN ('generation','context-capture','dispatch-review','publication','attempt','none')),
	CONSTRAINT "storyteller_execution_stage_sha" CHECK ("storyteller_execution_stage"."source_sha256" IS NULL OR "storyteller_execution_stage"."source_sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "storyteller_execution_stage" ADD CONSTRAINT "storyteller_execution_stage_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "storyteller_execution_stage_identity" ON "storyteller_execution_stage" USING btree ("generation_id","stage","idempotency_key");
--> statement-breakpoint
CREATE INDEX "storyteller_execution_stage_generation" ON "storyteller_execution_stage" USING btree ("generation_id","created_at");
