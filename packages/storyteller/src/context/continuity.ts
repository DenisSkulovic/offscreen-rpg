import { z } from 'zod';

const key = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/);
const evidence = z.array(z.string().min(1).max(100)).min(1).max(4);
export const continuityNoteSchema = z.strictObject({
  key,
  text: z.string().min(1).max(400),
  sources: z.array(z.uuid()).min(1).max(4),
  revision: z.number().int().positive(),
});
export const continuityNotesSchema = z
  .array(continuityNoteSchema)
  .max(20)
  .refine(
    (notes) => new Set(notes.map((note) => note.key)).size === notes.length,
    'Duplicate note keys',
  );
const write = { key, text: z.string().min(1).max(400), evidence };
export const continuityPatchSchema = z
  .array(
    z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('create'), ...write }),
      z.strictObject({ kind: z.literal('update'), ...write }),
      z.strictObject({
        kind: z.literal('retire'),
        key,
        reason: z.string().min(1).max(400),
      }),
    ]),
  )
  .max(8)
  .refine(
    (patch) => new Set(patch.map((change) => change.key)).size === patch.length,
    'Conflicting note changes',
  );
export type ContinuityNotes = z.infer<typeof continuityNotesSchema>;
export type ContinuityPatch = z.infer<typeof continuityPatchSchema>;

/** Derived notes only. The caller owns source scope and atomic passage publication. */
export function applyContinuityPatch(input: {
  notes: unknown;
  patch: unknown;
  evidence: Readonly<Record<string, string>>;
  revision: number;
}): ContinuityNotes {
  const notes = new Map(
    continuityNotesSchema.parse(input.notes).map((note) => [note.key, note]),
  );
  for (const change of continuityPatchSchema.parse(input.patch)) {
    const exists = notes.has(change.key);
    if (
      (change.kind === 'create' && exists) ||
      (change.kind !== 'create' && !exists)
    ) {
      throw new Error('Continuity change does not match existing note');
    }
    if (change.kind === 'retire') {
      notes.delete(change.key);
      continue;
    }
    const sources = change.evidence.map((handle) => {
      const source = input.evidence[handle];
      if (!source) {
        throw new Error('Unknown continuity evidence');
      }
      return source;
    });
    notes.set(change.key, {
      key: change.key,
      text: change.text,
      sources: [...new Set(sources)],
      revision: input.revision,
    });
  }
  return continuityNotesSchema.parse([...notes.values()]);
}
