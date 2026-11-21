-- WR07B: storyteller_writer_mission.owner_id holds Better Auth text user ids.
-- Reverse: ALTER TABLE storyteller_writer_mission ALTER COLUMN owner_id TYPE uuid USING owner_id::uuid;
ALTER TABLE storyteller_writer_mission
  ALTER COLUMN owner_id TYPE text USING owner_id::text;