CREATE TABLE "admin_staff_principal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"access_epoch" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_staff_principal_status" CHECK ("admin_staff_principal"."status" IN ('active','suspended')),
	CONSTRAINT "admin_staff_principal_epoch" CHECK ("admin_staff_principal"."access_epoch" >= 1)
);
--> statement-breakpoint
CREATE TABLE "admin_staff_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_principal_id" uuid NOT NULL,
	"auth_session_id" text NOT NULL,
	"token_digest" text NOT NULL,
	"purpose" text DEFAULT 'admin' NOT NULL,
	"access_epoch_at_issue" integer NOT NULL,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"idle_expires_at" timestamp (3) with time zone NOT NULL,
	"revoked_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_staff_session_purpose" CHECK ("admin_staff_session"."purpose" = 'admin'),
	CONSTRAINT "admin_staff_session_token_digest_sha" CHECK ("admin_staff_session"."token_digest" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "admin_capability_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_principal_id" uuid NOT NULL,
	"package_id" text NOT NULL,
	"package_version" integer NOT NULL,
	"status" text DEFAULT 'inert' NOT NULL,
	"scope" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provenance" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp (3) with time zone,
	CONSTRAINT "admin_capability_assignment_status" CHECK ("admin_capability_assignment"."status" IN ('inert','active','revoked')),
	CONSTRAINT "admin_capability_assignment_version" CHECK ("admin_capability_assignment"."package_version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "admin_audit_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"staff_principal_id" uuid,
	"auth_user_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_staff_principal" ADD CONSTRAINT "admin_staff_principal_auth_user_id_user_id_fk" FOREIGN KEY ("auth_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admin_staff_session" ADD CONSTRAINT "admin_staff_session_staff_principal_id_admin_staff_principal_id_fk" FOREIGN KEY ("staff_principal_id") REFERENCES "public"."admin_staff_principal"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admin_staff_session" ADD CONSTRAINT "admin_staff_session_auth_session_id_session_id_fk" FOREIGN KEY ("auth_session_id") REFERENCES "public"."session"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admin_capability_assignment" ADD CONSTRAINT "admin_capability_assignment_staff_principal_id_admin_staff_principal_id_fk" FOREIGN KEY ("staff_principal_id") REFERENCES "public"."admin_staff_principal"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admin_audit_event" ADD CONSTRAINT "admin_audit_event_staff_principal_id_admin_staff_principal_id_fk" FOREIGN KEY ("staff_principal_id") REFERENCES "public"."admin_staff_principal"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "admin_staff_principal_auth_user" ON "admin_staff_principal" USING btree ("auth_user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "admin_staff_session_token_digest" ON "admin_staff_session" USING btree ("token_digest");
--> statement-breakpoint
CREATE INDEX "admin_staff_session_staff" ON "admin_staff_session" USING btree ("staff_principal_id");
--> statement-breakpoint
CREATE INDEX "admin_staff_session_auth" ON "admin_staff_session" USING btree ("auth_session_id");
--> statement-breakpoint
CREATE INDEX "admin_capability_assignment_staff" ON "admin_capability_assignment" USING btree ("staff_principal_id");
--> statement-breakpoint
CREATE INDEX "admin_audit_event_created" ON "admin_audit_event" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "admin_audit_event_staff" ON "admin_audit_event" USING btree ("staff_principal_id");
