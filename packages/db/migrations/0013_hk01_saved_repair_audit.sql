CREATE TABLE "storyteller_saved_repair_audit" (
	"attempt_id" uuid PRIMARY KEY NOT NULL,
	"operator_id" text NOT NULL,
	"reason" text NOT NULL,
	"plan_fingerprint" text NOT NULL,
	"review_packet_sha256" text NOT NULL,
	"evidence_sha256" text NOT NULL,
	"prior_generation_state" text NOT NULL,
	"prior_status_revision" integer NOT NULL,
	"settlement_result" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storyteller_saved_repair_audit_plan_fingerprint" CHECK ("storyteller_saved_repair_audit"."plan_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "storyteller_saved_repair_audit_review_packet_sha256" CHECK ("storyteller_saved_repair_audit"."review_packet_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "storyteller_saved_repair_audit_evidence_sha256" CHECK ("storyteller_saved_repair_audit"."evidence_sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "storyteller_saved_repair_audit" ADD CONSTRAINT "storyteller_saved_repair_audit_attempt_id_storyteller_attempt_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."storyteller_attempt"("id") ON DELETE restrict ON UPDATE no action;