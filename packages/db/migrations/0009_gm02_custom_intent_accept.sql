ALTER TABLE "custom_intent_candidate" ADD COLUMN "accepted_operation_id" uuid;
--> statement-breakpoint
ALTER TABLE "custom_intent_candidate" DROP CONSTRAINT "custom_intent_candidate_status";
--> statement-breakpoint
ALTER TABLE "custom_intent_candidate" ADD CONSTRAINT "custom_intent_candidate_status" CHECK ("status" in ('reviewable', 'clarify', 'rejected', 'unsupported', 'accepted'));
--> statement-breakpoint
CREATE UNIQUE INDEX "custom_intent_candidate_accepted_op" ON "custom_intent_candidate" USING btree ("accepted_operation_id") WHERE "accepted_operation_id" IS NOT NULL;
