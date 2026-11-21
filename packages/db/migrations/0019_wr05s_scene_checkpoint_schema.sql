ALTER TABLE "story_scene_checkpoint" DROP CONSTRAINT "story_scene_checkpoint_schema";
--> statement-breakpoint
ALTER TABLE "story_scene_checkpoint" ADD CONSTRAINT "story_scene_checkpoint_schema" CHECK ("state_schema_version" IN (1, 2));