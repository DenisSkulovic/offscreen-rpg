CREATE TABLE "admin_case" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"created_by_staff_id" uuid NOT NULL,
	"assigned_staff_id" uuid,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_case_status" CHECK ("admin_case"."status" IN ('open','assigned','closed')),
	CONSTRAINT "admin_case_category" CHECK ("admin_case"."category" IN ('account','campaign','operation','other')),
	CONSTRAINT "admin_case_title_len" CHECK (char_length("admin_case"."title") BETWEEN 1 AND 120)
);
--> statement-breakpoint
CREATE TABLE "admin_case_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"subject_kind" text NOT NULL,
	"subject_id" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_case_link_kind" CHECK ("admin_case_link"."subject_kind" IN ('player','campaign','operation','account')),
	CONSTRAINT "admin_case_link_subject_len" CHECK (char_length("admin_case_link"."subject_id") BETWEEN 1 AND 128)
);
--> statement-breakpoint
ALTER TABLE "admin_case" ADD CONSTRAINT "admin_case_created_by_staff_id_admin_staff_principal_id_fk" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."admin_staff_principal"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admin_case" ADD CONSTRAINT "admin_case_assigned_staff_id_admin_staff_principal_id_fk" FOREIGN KEY ("assigned_staff_id") REFERENCES "public"."admin_staff_principal"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admin_case_link" ADD CONSTRAINT "admin_case_link_case_id_admin_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."admin_case"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "admin_case_idempotency" ON "admin_case" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE INDEX "admin_case_status_updated" ON "admin_case" USING btree ("status","updated_at");
--> statement-breakpoint
CREATE INDEX "admin_case_assigned" ON "admin_case" USING btree ("assigned_staff_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "admin_case_link_identity" ON "admin_case_link" USING btree ("case_id","subject_kind","subject_id");
--> statement-breakpoint
CREATE INDEX "admin_case_link_case" ON "admin_case_link" USING btree ("case_id");
