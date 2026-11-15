CREATE TABLE "storyteller_prompt_provenance" (
	"generation_id" uuid PRIMARY KEY NOT NULL,
	"task_input_sha256" text NOT NULL,
	"compiled_request_sha256" text NOT NULL,
	"manifest" jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storyteller_prompt_provenance_task_sha" CHECK ("storyteller_prompt_provenance"."task_input_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "storyteller_prompt_provenance_request_sha" CHECK ("storyteller_prompt_provenance"."compiled_request_sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "storyteller_prompt_provenance" ADD CONSTRAINT "storyteller_prompt_provenance_generation_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generation"("id") ON DELETE restrict ON UPDATE no action;
