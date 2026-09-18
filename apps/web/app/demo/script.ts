import { z } from 'zod';
import definitions from './content/script.json';

const identitySchema = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const sceneSchema = z.strictObject({
  place: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  paragraphs: z.array(z.string().min(1).max(2000)).min(1).max(8),
  phase: z.enum(['decision', 'waiting', 'ended']),
  status: z.string().min(1).max(300),
  choices: z.array(
    z.strictObject({
      id: identitySchema,
      label: z.string().min(1).max(200),
      detail: z.string().min(1).max(300),
    }),
  ),
  next: z.record(identitySchema, identitySchema),
});
const scriptSchema = z
  .record(identitySchema, sceneSchema)
  .superRefine((scenes, context) => {
    for (const [sceneId, scene] of Object.entries(scenes)) {
      for (const [choiceId, targetId] of Object.entries(scene.next)) {
        if (!scenes[targetId]) {
          context.addIssue({
            code: 'custom',
            path: [sceneId, 'next', choiceId],
            message: 'Transition target is not declared',
          });
        }
      }
    }
  });

// Authored presentation content is data; this module only validates its graph.
export const scenes = scriptSchema.parse(definitions);
