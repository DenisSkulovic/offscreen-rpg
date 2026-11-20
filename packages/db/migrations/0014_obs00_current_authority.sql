CREATE UNIQUE INDEX "storyteller_run_id_account" ON "storyteller_run" USING btree ("id","account_id");
--> statement-breakpoint
CREATE TABLE "storyteller_current_platform_policy" (
	"id" uuid PRIMARY KEY NOT NULL,
	"revision" integer NOT NULL,
	"profile" jsonb NOT NULL,
	"route_map" jsonb NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storyteller_current_platform_policy_revision" CHECK ("storyteller_current_platform_policy"."revision" > 0),
	CONSTRAINT "storyteller_current_platform_policy_profile_schema" CHECK (
		jsonb_typeof("storyteller_current_platform_policy"."profile") = 'object'
		AND "storyteller_current_platform_policy"."profile" ? 'schemaVersion'
		AND "storyteller_current_platform_policy"."profile"->>'schemaVersion' = '1'
		AND "storyteller_current_platform_policy"."profile" ? 'revision'
		AND ("storyteller_current_platform_policy"."profile"->>'revision')::integer = "storyteller_current_platform_policy"."revision"
		AND "storyteller_current_platform_policy"."profile" ? 'id'
		AND "storyteller_current_platform_policy"."profile" ? 'allowedRoutes'
		AND jsonb_typeof("storyteller_current_platform_policy"."profile"->'allowedRoutes') = 'array'
	),
	CONSTRAINT "storyteller_current_platform_policy_route_map_schema" CHECK (
		jsonb_typeof("storyteller_current_platform_policy"."route_map") = 'object'
		AND "storyteller_current_platform_policy"."route_map" ? 'schemaVersion'
		AND "storyteller_current_platform_policy"."route_map"->>'schemaVersion' = '1'
		AND "storyteller_current_platform_policy"."route_map" ? 'revision'
		AND ("storyteller_current_platform_policy"."route_map"->>'revision')::integer = "storyteller_current_platform_policy"."revision"
		AND "storyteller_current_platform_policy"."route_map" ? 'routes'
		AND jsonb_typeof("storyteller_current_platform_policy"."route_map"->'routes') = 'array'
		AND jsonb_array_length("storyteller_current_platform_policy"."route_map"->'routes') > 0
	)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "storyteller_current_platform_policy_one_enabled" ON "storyteller_current_platform_policy" USING btree ("enabled") WHERE "storyteller_current_platform_policy"."enabled" = true;
--> statement-breakpoint
CREATE TABLE "storyteller_current_owner_grant" (
	"id" uuid PRIMARY KEY NOT NULL,
	"revision" integer NOT NULL,
	"user_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"entitlement_profile" jsonb NOT NULL,
	"restrictions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp (3) with time zone,
	"no_expiry" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp (3) with time zone,
	"requested_route" text NOT NULL,
	"requested_funding_mode" text NOT NULL,
	"operator_id" text NOT NULL,
	"approval_identity" text NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storyteller_current_owner_grant_revision" CHECK ("storyteller_current_owner_grant"."revision" > 0),
	CONSTRAINT "storyteller_current_owner_grant_entitlement_schema" CHECK (
		jsonb_typeof("storyteller_current_owner_grant"."entitlement_profile") = 'object'
		AND "storyteller_current_owner_grant"."entitlement_profile" ? 'schemaVersion'
		AND "storyteller_current_owner_grant"."entitlement_profile"->>'schemaVersion' = '1'
		AND "storyteller_current_owner_grant"."entitlement_profile" ? 'revision'
		AND ("storyteller_current_owner_grant"."entitlement_profile"->>'revision')::integer = "storyteller_current_owner_grant"."revision"
	),
	CONSTRAINT "storyteller_current_owner_grant_restrictions_array" CHECK (
		jsonb_typeof("storyteller_current_owner_grant"."restrictions") = 'array'
	),
	CONSTRAINT "storyteller_current_owner_grant_revoked" CHECK (
		("storyteller_current_owner_grant"."revoked_at" IS NULL) OR ("storyteller_current_owner_grant"."enabled" = false)
	),
	CONSTRAINT "storyteller_current_owner_grant_expiry" CHECK (
		("storyteller_current_owner_grant"."no_expiry" = true AND "storyteller_current_owner_grant"."expires_at" IS NULL)
		OR ("storyteller_current_owner_grant"."no_expiry" = false AND "storyteller_current_owner_grant"."expires_at" IS NOT NULL)
	),
	CONSTRAINT "storyteller_current_owner_grant_requested_route" CHECK ("storyteller_current_owner_grant"."requested_route" ~ '^[a-z0-9][a-z0-9._:-]{0,99}$'),
	CONSTRAINT "storyteller_current_owner_grant_requested_funding" CHECK ("storyteller_current_owner_grant"."requested_funding_mode" IN ('sponsored','prepaid','on-demand'))
);
--> statement-breakpoint
ALTER TABLE "storyteller_current_owner_grant" ADD CONSTRAINT "storyteller_current_owner_grant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "storyteller_current_owner_grant" ADD CONSTRAINT "storyteller_current_owner_grant_account_id_storyteller_funding_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."storyteller_funding"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "storyteller_current_owner_grant" ADD CONSTRAINT "storyteller_current_owner_grant_run_account_fk" FOREIGN KEY ("run_id","account_id") REFERENCES "public"."storyteller_run"("id","account_id") ON DELETE restrict ON UPDATE no action;