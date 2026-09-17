import { z } from 'zod';
import { passageContentSchema } from '@offscreen/contracts/stories';

const text = (maximum: number) => z.string().max(maximum).regex(/\S/);
const choice = z.strictObject({
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/),
  label: text(500),
  // Player intention, not executable effects or a promised successful outcome.
  intention: text(2000),
});

export const playableProposalSchema = z
  .strictObject({
    version: z.literal(1),
    content: passageContentSchema,
    next: z.discriminatedUnion('kind', [
      z.strictObject({
        kind: z.literal('choice'),
        prompt: text(2000),
        options: z.array(choice).min(1).max(12),
      }),
      z.strictObject({ kind: z.literal('end') }),
    ]),
  })
  .superRefine((proposal, context) => {
    if (
      proposal.next.kind === 'choice' &&
      new Set(proposal.next.options.map((option) => option.id)).size !==
        proposal.next.options.length
    ) {
      context.addIssue({
        code: 'custom',
        path: ['next', 'options'],
        message: 'Option identities must be unique',
      });
    }
  });

export type PlayableProposal = z.infer<typeof playableProposalSchema>;

/** Structural/task validation only; narrative truth still needs evaluation. */
export function validatePlayableResult(
  task: 'opening' | 'continuation',
  output: unknown,
) {
  const proposal = playableProposalSchema.parse(output);
  if (task === 'opening' && proposal.next.kind !== 'choice') {
    throw new Error('A playable opening must offer an intention');
  }
  return proposal;
}

/** Converts a validated offer to existing presentation data; does not commit it. */
export function playablePresentation(proposed: unknown) {
  const proposal = playableProposalSchema.parse(proposed);
  if (proposal.next.kind === 'end') {
    return {
      content: proposal.content,
      interaction: null,
    };
  }
  return {
    content: proposal.content,
    interaction: {
      kind: 'choice.v1' as const,
      prompt: proposal.next.prompt,
      options: proposal.next.options.map((option) => ({
        id: option.id,
        label: option.label,
      })),
    },
  };
}
