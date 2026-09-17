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
CREATE INDEX "outbox_pending" ON "outbox" USING btree ("available_at","id") WHERE "outbox"."delivered_at" IS NULL;
--> statement-breakpoint
INSERT INTO "outbox" ("id", "topic", "operation_id")
SELECT "id", 'opening.scripted.v1', "id" FROM "generation"
WHERE "kind" = 'opening.scripted.v1' AND "state" = 'pending';
