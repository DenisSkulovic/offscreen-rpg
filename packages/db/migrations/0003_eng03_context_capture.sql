CREATE TABLE "storyteller_context_capture" (
	"capture_id" uuid PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"capture" jsonb NOT NULL,
	"capture_sha256" text NOT NULL,
	"state" text DEFAULT 'captured' NOT NULL,
	"materialization_attempts" integer DEFAULT 0 NOT NULL,
	"lease_id" uuid,
	"lease_expires_at" timestamp (3) with time zone,
	"materialized_request_sha256" text,
	"failure_code" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storyteller_context_capture_operation" UNIQUE("operation_id"),
	CONSTRAINT "storyteller_context_capture_state" CHECK ("storyteller_context_capture"."state" IN ('captured','materializing','ready','held','stale','blocked')),
	CONSTRAINT "storyteller_context_capture_sha" CHECK ("storyteller_context_capture"."capture_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "storyteller_context_capture_attempts" CHECK ("storyteller_context_capture"."materialization_attempts" >= 0 AND "storyteller_context_capture"."materialization_attempts" <= 3),
	CONSTRAINT "storyteller_context_capture_request_sha" CHECK ("storyteller_context_capture"."materialized_request_sha256" IS NULL OR "storyteller_context_capture"."materialized_request_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "storyteller_context_capture_lease" CHECK (("storyteller_context_capture"."lease_id" IS NULL) = ("storyteller_context_capture"."lease_expires_at" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "storyteller_context_capture" ADD CONSTRAINT "storyteller_context_capture_capture_id_generation_id_fk" FOREIGN KEY ("capture_id") REFERENCES "public"."generation"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "storyteller_context_capture_story" ON "storyteller_context_capture" USING btree ("story_id");
