import { z } from 'zod';

const descriptiveKindSchema = z.enum([
  'premise',
  'lore',
  'identity',
  'relationship',
  'narrative-thread',
  'private-possibility',
]);

const descriptivePathSchema = z
  .string()
  .min(1)
  .max(320)
  .regex(/^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))(?!.*\\).+\.md$/);

const proposedContentSchema = z.strictObject({
  path: descriptivePathSchema,
  kind: descriptiveKindSchema,
  authority: z.enum(['canon', 'attributed', 'noncanonical']),
  visibility: z.enum(['player-known', 'storyteller-private']),
  title: z.string().trim().min(1).max(240),
  body: z.string().trim().min(1).max(6000),
  reason: z.string().trim().min(1).max(240),
  recallAs: z.enum(['identity', 'place', 'thread']).optional(),
});

export const proposedDocumentChangeSchema = z
  .discriminatedUnion('operation', [
    proposedContentSchema.extend({
      operation: z.literal('create'),
    }),
    proposedContentSchema.extend({
      operation: z.literal('revise'),
      documentId: z.uuid(),
      expectedRevision: z.number().int().positive(),
    }),
  ])
  .superRefine((change, context) => {
    const expectedRecallKind = {
      identity: 'identity',
      place: 'lore',
      thread: 'narrative-thread',
    } as const;
    if (change.recallAs && change.kind !== expectedRecallKind[change.recallAs]) {
      context.addIssue({
        code: 'custom',
        message: 'Recall cue role must match the descriptive document kind',
      });
    }
    if (
      change.kind === 'private-possibility' &&
      (change.authority !== 'noncanonical' ||
        change.visibility !== 'storyteller-private')
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Private possibilities must remain noncanonical and private',
      });
    }
    if (
      change.kind !== 'private-possibility' &&
      change.authority === 'noncanonical'
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Noncanonical proposals use the private-possibility kind',
      });
    }
  });

export const proposedDocumentChangesSchema = z
  .array(proposedDocumentChangeSchema)
  .max(8)
  .default([]);

export type ProposedDocumentChange = z.infer<
  typeof proposedDocumentChangeSchema
>;
