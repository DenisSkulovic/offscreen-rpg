ALTER TABLE "story_passage" ADD COLUMN "transition_id" uuid;--> statement-breakpoint
ALTER TABLE "story_passage" ADD CONSTRAINT "story_passage_transition" UNIQUE("story_id","transition_id");