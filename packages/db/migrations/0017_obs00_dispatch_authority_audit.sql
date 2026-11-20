ALTER TABLE "storyteller_attempt" ADD COLUMN "dispatch_authority_grant_id" uuid;
--> statement-breakpoint
ALTER TABLE "storyteller_attempt" ADD COLUMN "dispatch_platform_revision" integer;
--> statement-breakpoint
ALTER TABLE "storyteller_attempt" ADD COLUMN "dispatch_grant_revision" integer;
--> statement-breakpoint
ALTER TABLE "storyteller_attempt" ADD CONSTRAINT "storyteller_attempt_dispatch_authority_audit" CHECK (
  (
    "storyteller_attempt"."dispatch_authority_grant_id" IS NULL
    AND "storyteller_attempt"."dispatch_platform_revision" IS NULL
    AND "storyteller_attempt"."dispatch_grant_revision" IS NULL
  )
  OR (
    "storyteller_attempt"."dispatch_authority_grant_id" IS NOT NULL
    AND "storyteller_attempt"."dispatch_platform_revision" IS NOT NULL
    AND "storyteller_attempt"."dispatch_grant_revision" IS NOT NULL
    AND "storyteller_attempt"."dispatch_platform_revision" > 0
    AND "storyteller_attempt"."dispatch_grant_revision" > 0
  )
);