CREATE TABLE "terminal_device_pairing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_hash" text NOT NULL,
	"challenge_sha256" text NOT NULL,
	"source_ip_hash" text NOT NULL,
	"client_label" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"owner_id" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"approved_at" timestamp (3) with time zone,
	"consumed_at" timestamp (3) with time zone,
	CONSTRAINT "terminal_device_pairing_code_hash_key" UNIQUE("code_hash"),
	CONSTRAINT "terminal_device_pairing_code_hash" CHECK ("terminal_device_pairing"."code_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "terminal_device_pairing_challenge_sha256" CHECK ("terminal_device_pairing"."challenge_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "terminal_device_pairing_source_ip_hash" CHECK ("terminal_device_pairing"."source_ip_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "terminal_device_pairing_client_label" CHECK (char_length("terminal_device_pairing"."client_label") BETWEEN 1 AND 64),
	CONSTRAINT "terminal_device_pairing_state" CHECK ("terminal_device_pairing"."state" IN ('pending','approved','consumed','denied')),
	CONSTRAINT "terminal_device_pairing_approved_owner" CHECK (
		("terminal_device_pairing"."state" IN ('approved','consumed') AND "terminal_device_pairing"."owner_id" IS NOT NULL AND "terminal_device_pairing"."approved_at" IS NOT NULL) OR
		("terminal_device_pairing"."state" NOT IN ('approved','consumed'))
	),
	CONSTRAINT "terminal_device_pairing_consumed_at" CHECK (
		("terminal_device_pairing"."state" = 'consumed' AND "terminal_device_pairing"."consumed_at" IS NOT NULL) OR
		("terminal_device_pairing"."state" <> 'consumed' AND "terminal_device_pairing"."consumed_at" IS NULL)
	)
);
--> statement-breakpoint
CREATE TABLE "terminal_access_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" text NOT NULL,
	"scope" text NOT NULL,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"revoked_at" timestamp (3) with time zone,
	CONSTRAINT "terminal_access_token_token_hash_key" UNIQUE("token_hash"),
	CONSTRAINT "terminal_access_token_token_hash" CHECK ("terminal_access_token"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "terminal_access_token_scope" CHECK ("terminal_access_token"."scope" = 'player-story')
);
--> statement-breakpoint
ALTER TABLE "terminal_device_pairing" ADD CONSTRAINT "terminal_device_pairing_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "terminal_access_token" ADD CONSTRAINT "terminal_access_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "terminal_device_pairing_source_ip_created_idx" ON "terminal_device_pairing" USING btree ("source_ip_hash","created_at");
--> statement-breakpoint
CREATE INDEX "terminal_device_pairing_challenge_sha256_idx" ON "terminal_device_pairing" USING btree ("challenge_sha256");