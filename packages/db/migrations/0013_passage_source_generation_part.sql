ALTER TABLE "story_passage" ADD COLUMN "source_generation_part" text;--> statement-breakpoint
ALTER TABLE "story_passage" ADD CONSTRAINT "story_passage_generation_part" CHECK ("story_passage"."source_generation_part" IS NULL OR ("story_passage"."source_generation_id" IS NOT NULL AND "story_passage"."source_generation_part" IN ('current', 'arrival')));
