-- Preserve any earlier pineapple rehearsal outcomes while removing universal money fields.
ALTER TABLE "game_roll" ADD COLUMN "effects" jsonb;
--> statement-breakpoint
UPDATE "game_roll" SET "effects" = CASE WHEN "coins" = 0 THEN '[]'::jsonb
ELSE jsonb_build_array(jsonb_build_object('kind', 'quantity.change.v1', 'quantityId', 'coins', 'delta', "coins")) END;
--> statement-breakpoint
ALTER TABLE "game_roll" ALTER COLUMN "effects" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "game_roll" DROP COLUMN "coins";
--> statement-breakpoint
UPDATE "campaign" SET "character" = ("character" - 'coins') || jsonb_build_object(
  'quantities', jsonb_build_array(jsonb_build_object('id', 'coins', 'label', 'Coins', 'value', "character"->'coins'))
) WHERE "character" ? 'coins';
--> statement-breakpoint
UPDATE "game_activity" SET "plan" = ("plan" - 'successCoins' - 'failureCoins') || jsonb_build_object(
  'successEffects', CASE WHEN ("plan"->>'successCoins')::integer = 0 THEN '[]'::jsonb
    ELSE jsonb_build_array(jsonb_build_object('kind', 'quantity.change.v1', 'quantityId', 'coins', 'delta', "plan"->'successCoins')) END,
  'failureEffects', CASE WHEN ("plan"->>'failureCoins')::integer = 0 THEN '[]'::jsonb
    ELSE jsonb_build_array(jsonb_build_object('kind', 'quantity.change.v1', 'quantityId', 'coins', 'delta', "plan"->'failureCoins')) END
) WHERE "plan" ? 'successCoins';
