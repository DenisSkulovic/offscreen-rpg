import { z } from 'zod';

/** Shared saved-premise fields. Opening and playable requests mean the same content. */
export const premiseContentSchema = z.strictObject({
  title: z.string().max(160),
  premise: z.string().max(6000).regex(/\S/),
  storytellingDirection: z.string().max(2000),
});
