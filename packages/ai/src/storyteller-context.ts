import { z } from 'zod';
import {
  passageContentSchema,
  storyItemsSchema,
} from '@offscreen/contracts/stories';
import { premiseContentSchema } from './premise';
import { continuityNotesSchema } from './continuity';

export const evidencePassageSchema = z.strictObject({
  id: z.uuid(),
  sequence: z.number().int().positive(),
  content: passageContentSchema,
  response: z.string().max(2000).nullable(),
});
export const contextInputSchema = z.strictObject({
  premise: premiseContentSchema,
  current: evidencePassageSchema.nullable(),
  items: storyItemsSchema,
  selected: z
    .strictObject({
      id: z.string().max(100),
      label: z.string().max(500),
      intention: z.string().max(2000),
    })
    .nullable(),
  notes: continuityNotesSchema,
  evidence: z.array(evidencePassageSchema).max(87),
});
export type StorytellerContext = z.infer<typeof contextInputSchema>;

export function contextPayload(context: StorytellerContext) {
  const handle = (id: string) => {
    const passage = context.evidence.find((item) => item.id === id);
    if (!passage) {
      throw new Error('Missing continuity evidence');
    }
    return `p${passage.sequence}`;
  };
  return {
    premise: context.premise,
    current: context.current
      ? {
          handle: `p${context.current.sequence}`,
          content: context.current.content,
        }
      : null,
    items: context.items,
    selected: context.selected,
    notes: context.notes.map((note) => ({
      key: note.key,
      text: note.text,
      evidence: note.sources.map(handle),
    })),
    evidence: context.evidence.map((passage) => ({
      handle: `p${passage.sequence}`,
      content: passage.content,
      response: passage.response,
    })),
  };
}

/** Preserve mandatory note evidence; omit complete optional passages, never partial facts. */
export function boundStorytellerContext(
  input: unknown,
  fits: (context: StorytellerContext) => boolean,
) {
  const context = contextInputSchema.parse(input);
  const ids = context.evidence.map((passage) => passage.id);
  const sequences = context.evidence.map((passage) => passage.sequence);
  if (
    new Set(ids).size !== ids.length ||
    new Set(sequences).size !== sequences.length
  ) {
    throw new Error('Duplicate context evidence');
  }
  const required = new Set(context.notes.flatMap((note) => note.sources));
  if (context.current) {
    required.add(context.current.id);
  }
  const mandatory = context.evidence.filter((passage) =>
    required.has(passage.id),
  );
  if (mandatory.length !== required.size) {
    throw new Error('Missing continuity evidence');
  }
  const captured = { ...context, evidence: mandatory };
  if (!fits(captured)) {
    throw new Error('context_too_large');
  }
  const optional = context.evidence
    .filter((passage) => !required.has(passage.id))
    .sort((a, b) => b.sequence - a.sequence)
    .slice(0, 6);
  for (const passage of optional) {
    const candidate = {
      ...captured,
      evidence: [...captured.evidence, passage],
    };
    if (fits(candidate)) {
      captured.evidence.push(passage);
    }
  }
  captured.evidence.sort((a, b) => a.sequence - b.sequence);
  return captured;
}
