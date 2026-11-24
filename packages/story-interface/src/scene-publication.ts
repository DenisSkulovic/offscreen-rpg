import { z } from 'zod';
import {
  publicSceneAppearanceV1Schema,
  type PublicSceneAppearanceV1,
} from './stories.js';

const publicationBackdropSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/);

/** Server persistence subset. The public directive stays opaque for already stored reads. */
export const publicationSceneDirectiveV1Schema = z.strictObject({
  schemaVersion: z.literal(1),
  scene: z.strictObject({
    palette: z
      .strictObject({
        backdrop: publicationBackdropSchema,
      })
      .optional(),
    atmosphere: z
      .strictObject({
        lighting: z.enum(['neutral', 'dim', 'diffuse', 'radiant']),
      })
      .optional(),
  }),
});

/**
 * Build a stored appearance from an internal candidate.
 * Source identity is the server arguments. An invalid candidate returns undefined.
 */
export function makeValidatedAppearanceForPublication(args: {
  storyId: string;
  passageId: string;
  candidate?: unknown;
}): PublicSceneAppearanceV1 | undefined {
  if (args.candidate === undefined || args.candidate === null) return undefined;
  const directive = publicationSceneDirectiveV1Schema.safeParse(args.candidate);
  if (!directive.success) return undefined;
  const scene = {
    ...directive.data.scene,
    ...(directive.data.scene.palette
      ? {
          palette: {
            backdrop: directive.data.scene.palette.backdrop.toLowerCase(),
          },
        }
      : {}),
  };
  const stored = publicSceneAppearanceV1Schema.safeParse({
    source: { storyId: args.storyId, passageId: args.passageId },
    directive: { schemaVersion: 1, scene },
  });
  return stored.success ? stored.data : undefined;
}

/** Drop corrupt decoration without failing the story snapshot. */
export function readOptionalSceneAppearance(
  value: unknown,
): PublicSceneAppearanceV1 | undefined {
  if (value === undefined || value === null) return undefined;
  const parsed = publicSceneAppearanceV1Schema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/** Keep a saved appearance only when it belongs to this story and passage. */
export function projectStoredSceneAppearance(
  value: unknown,
  source: { storyId: string; passageId: string },
): PublicSceneAppearanceV1 | undefined {
  const stored = readOptionalSceneAppearance(value);
  if (!stored) return undefined;
  if (
    stored.source.storyId !== source.storyId ||
    stored.source.passageId !== source.passageId
  ) {
    return undefined;
  }
  return stored;
}

