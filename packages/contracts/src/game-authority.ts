import { z } from 'zod';
import { respondToStorySchema } from './stories';

/** Private Nest → Game Authority contract for one story seam. Not a player route. */
export const gameAuthoritySeamVersion = 'game-authority.story-seam.v1' as const;

export const gameAuthorityActorIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,128}$/);

export const gameAuthorityStoryIdSchema = z.uuid();

/** Same body as the player resolution command. `ownerId` is not a field. */
export const gameAuthorityResolutionRequestSchema = respondToStorySchema;

export const gameAuthorityErrorSchema = z.strictObject({
  code: z.enum([
    'invalid',
    'not_found',
    'conflict',
    'unavailable',
    'unauthorized',
  ]),
  reason: z.string().max(80).optional(),
});
