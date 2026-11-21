CREATE TABLE "storyteller_writer_child" (
	"child_id" uuid PRIMARY KEY NOT NULL,
	"mission_id" uuid NOT NULL,
	"parent_tool_call_id" text NOT NULL,
	"child_ordinal" integer NOT NULL,
	"question" text NOT NULL,
	"request_sha256" text NOT NULL,
	"root_hash" text NOT NULL,
	"root_revision" integer NOT NULL,
	"tool_allowlist" jsonb NOT NULL,
	"skill_hashes" jsonb NOT NULL,
	"policy" jsonb NOT NULL,
	"max_microusd" bigint NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"result_cas_hash" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storyteller_writer_child_identity" UNIQUE("mission_id","parent_tool_call_id","child_ordinal"),
	CONSTRAINT "storyteller_writer_child_ordinal" CHECK ("storyteller_writer_child"."child_ordinal" >= 1 AND "storyteller_writer_child"."child_ordinal" <= 2),
	CONSTRAINT "storyteller_writer_child_parent_tool_call_id" CHECK ("storyteller_writer_child"."parent_tool_call_id" ~ '^t[1-9][0-9]*$'),
	CONSTRAINT "storyteller_writer_child_request_sha" CHECK ("storyteller_writer_child"."request_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "storyteller_writer_child_root_hash" CHECK ("storyteller_writer_child"."root_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "storyteller_writer_child_root_revision" CHECK ("storyteller_writer_child"."root_revision" > 0),
	CONSTRAINT "storyteller_writer_child_max_microusd" CHECK ("storyteller_writer_child"."max_microusd" > 0),
	CONSTRAINT "storyteller_writer_child_result_hash" CHECK ("storyteller_writer_child"."result_cas_hash" IS NULL OR "storyteller_writer_child"."result_cas_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "storyteller_writer_child_state" CHECK ("storyteller_writer_child"."state" IN ('pending','running','ready','held','failed','uncertain')),
	CONSTRAINT "storyteller_writer_child_tool_allowlist_array" CHECK (jsonb_typeof("storyteller_writer_child"."tool_allowlist") = 'array'),
	CONSTRAINT "storyteller_writer_child_skill_hashes_array" CHECK (jsonb_typeof("storyteller_writer_child"."skill_hashes") = 'array'),
	CONSTRAINT "storyteller_writer_child_policy_object" CHECK (jsonb_typeof("storyteller_writer_child"."policy") = 'object'),
	CONSTRAINT "storyteller_writer_child_question_length" CHECK (char_length("storyteller_writer_child"."question") >= 1 AND char_length("storyteller_writer_child"."question") <= 1200)
);
--> statement-breakpoint
CREATE INDEX "storyteller_writer_child_mission" ON "storyteller_writer_child" USING btree ("mission_id");
--> statement-breakpoint
ALTER TABLE "storyteller_writer_child" ADD CONSTRAINT "storyteller_writer_child_mission_id_storyteller_writer_mission_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."storyteller_writer_mission"("id") ON DELETE restrict ON UPDATE no action;