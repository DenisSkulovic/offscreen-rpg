ALTER TABLE "storyteller_context_capture" ADD COLUMN "rearm_epoch" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "storyteller_context_capture" ADD CONSTRAINT "storyteller_context_capture_rearm_epoch" CHECK ("storyteller_context_capture"."rearm_epoch" >= 0 AND "storyteller_context_capture"."rearm_epoch" <= 1);
--> statement-breakpoint
CREATE TABLE "storyteller_context_capture_rearm" (
	"rearm_id" uuid PRIMARY KEY NOT NULL,
	"capture_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"operator_id" text NOT NULL,
	"reason_code" text NOT NULL,
	"incident_ref" text,
	"previous_state" text NOT NULL,
	"previous_attempts" integer NOT NULL,
	"previous_failure_code" text,
	"epoch" integer NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storyteller_context_capture_rearm_reason" CHECK ("storyteller_context_capture_rearm"."reason_code" IN ('storage-restored','transient-infra-recovered')),
	CONSTRAINT "storyteller_context_capture_rearm_epoch" CHECK ("storyteller_context_capture_rearm"."epoch" = 1)
);
--> statement-breakpoint
ALTER TABLE "storyteller_context_capture_rearm" ADD CONSTRAINT "storyteller_context_capture_rearm_capture_id_fk" FOREIGN KEY ("capture_id") REFERENCES "public"."storyteller_context_capture"("capture_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "storyteller_context_capture_rearm_one_epoch" ON "storyteller_context_capture_rearm" USING btree ("capture_id");
--> statement-breakpoint
CREATE INDEX "storyteller_context_capture_rearm_story" ON "storyteller_context_capture_rearm" USING btree ("story_id");
