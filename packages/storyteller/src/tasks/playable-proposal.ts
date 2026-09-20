import { z } from 'zod';
import { passageContentSchema } from '@offscreen/contracts/stories';

const meaningfulText = (minimum: number, maximum: number, description: string) =>
  z.string().min(minimum).max(maximum).regex(/\S/).describe(description);
const choice = z.strictObject({
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/),
  label: meaningfulText(
    2,
    500,
    'Specific visible player action; never a placeholder or single letter.',
  ),
  // Player intention, not executable effects or a promised successful outcome.
  intention: meaningfulText(
    8,
    2000,
    'Complete description of what the player attempts; never a placeholder.',
  ),
  // Private anticipatory retrieval hints. The application validates these
  // against the exact captured world catalogue and loads them only if this
  // option is selected; they are never part of the player-facing offer.
  worldSections: z
    .array(z.string().regex(/^k[1-9][0-9]*\.s[1-9][0-9]*$/))
    .max(4)
    .refine((handles) => new Set(handles).size === handles.length, {
      message: 'World section handles must be unique',
    })
    .optional(),
  // Task-local aliases are resolved through the source task to stable
  // campaign document identities before a successor context is loaded.
  campaignDocuments: z
    .array(z.string().regex(/^d[1-9][0-9]*$/))
    .max(4)
    .refine((handles) => new Set(handles).size === handles.length, {
      message: 'Campaign document handles must be unique',
    })
    .optional(),
});

export const playableChoiceNextSchema = z.strictObject({
  kind: z.literal('choice'),
  prompt: meaningfulText(
    5,
    2000,
    'Meaningful question or decision prompt shown to the player.',
  ),
  options: z.array(choice).min(1).max(12),
});
export const playableEndNextSchema = z.strictObject({
  kind: z.literal('end'),
});
export const playableSceneNextSchema = z.discriminatedUnion('kind', [
  playableChoiceNextSchema,
  playableEndNextSchema,
]);

function uniqueChoiceIds(
  next: { kind: string; options?: Array<{ id: string }> },
  path: Array<string | number>,
  context: z.RefinementCtx,
) {
  if (next.kind !== 'choice' || !next.options) {
    return;
  }
  if (
    new Set(next.options.map((option) => option.id)).size !==
    next.options.length
  ) {
    context.addIssue({
      code: 'custom',
      path,
      message: 'Option identities must be unique',
    });
  }
}

export const playableProposalSchema = z
  .strictObject({
    version: z.literal(1),
    content: passageContentSchema,
    next: playableSceneNextSchema,
  })
  .superRefine((proposal, context) => {
    uniqueChoiceIds(proposal.next, ['next', 'options'], context);
  });

export type PlayableProposal = z.infer<typeof playableProposalSchema>;

export const continuationIntervalNextSchema = z.strictObject({
  kind: z.literal('interval'),
  gameDurationMs: z.number().int().positive().max(2147483647),
  arrival: z.strictObject({
    content: passageContentSchema,
    next: playableSceneNextSchema,
  }),
});

export const continuationResultSchema = z
  .strictObject({
    version: z.literal(2),
    content: passageContentSchema,
    next: z.discriminatedUnion('kind', [
      playableChoiceNextSchema,
      playableEndNextSchema,
      continuationIntervalNextSchema,
    ]),
  })
  .superRefine((result, context) => {
    uniqueChoiceIds(result.next, ['next', 'options'], context);
    if (result.next.kind === 'interval') {
      uniqueChoiceIds(
        result.next.arrival.next,
        ['next', 'arrival', 'next', 'options'],
        context,
      );
    }
  });

export type ContinuationResult = z.infer<typeof continuationResultSchema>;

export const generatedStorytellerOutputSchema = z.union([
  playableProposalSchema,
  continuationResultSchema,
]);

export const generationSourcePartSchema = z.enum(['current', 'arrival']);
export type GenerationSourcePart = z.infer<typeof generationSourcePartSchema>;

export const publishedPlayableSchema = z.strictObject({
  content: passageContentSchema,
  next: playableSceneNextSchema,
});
export type PublishedPlayable = z.infer<typeof publishedPlayableSchema>;

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

export function validateContinuationResult(output: unknown) {
  return continuationResultSchema.parse(output);
}

function publishedFromProposal(proposal: PlayableProposal): PublishedPlayable {
  return { content: proposal.content, next: proposal.next };
}

/** Selects the validated publishable slice named by persisted generation provenance. */
export function publishedPlayableFromGeneration(input: {
  output: unknown;
  sourcePart: GenerationSourcePart;
}): PublishedPlayable {
  const sourcePart = input.sourcePart;
  if (sourcePart === 'arrival') {
    const result = continuationResultSchema.safeParse(input.output);
    if (!result.success || result.data.next.kind !== 'interval') {
      throw new Error(
        'Generation output does not contain the declared arrival',
      );
    }
    return {
      content: result.data.next.arrival.content,
      next: result.data.next.arrival.next,
    };
  }
  const proposal = playableProposalSchema.safeParse(input.output);
  if (proposal.success) {
    return publishedFromProposal(proposal.data);
  }
  const result = continuationResultSchema.safeParse(input.output);
  if (!result.success) {
    throw new Error(
      'Generation output is not a supported playable publication',
    );
  }
  if (result.data.next.kind === 'interval') {
    throw new Error('Interval current part is not a playable offer');
  }
  return { content: result.data.content, next: result.data.next };
}

export function selectedIntentionFromPublished(
  published: PublishedPlayable,
  optionId: string,
) {
  if (published.next.kind !== 'choice') {
    throw new Error('Proposal does not match a supported current offer');
  }
  const selected = published.next.options.find(
    (option) => option.id === optionId,
  );
  if (!selected) {
    throw new Error('Proposal does not match a supported current offer');
  }
  return selected;
}

function presentPublished(scene: PublishedPlayable) {
  if (scene.next.kind === 'end') {
    return {
      content: scene.content,
      interaction: null,
    };
  }
  return {
    content: scene.content,
    interaction: {
      kind: 'choice.v1' as const,
      prompt: scene.next.prompt,
      options: scene.next.options.map((option) => ({
        id: option.id,
        label: option.label,
      })),
    },
  };
}

/** Converts a validated offer to existing presentation data; does not commit it. */
export function playablePresentation(proposed: unknown) {
  const published = publishedPlayableSchema.safeParse(proposed);
  if (published.success) {
    return presentPublished(published.data);
  }
  return presentPublished(
    publishedFromProposal(playableProposalSchema.parse(proposed)),
  );
}

export function continuationCurrentPresentation(result: ContinuationResult) {
  if (result.next.kind === 'interval') {
    return {
      content: result.content,
      interaction: null,
    };
  }
  return presentPublished({ content: result.content, next: result.next });
}

export function continuationArrivalPresentation(result: ContinuationResult) {
  if (result.next.kind !== 'interval') {
    throw new Error('Continuation result does not contain a prepared arrival');
  }
  return presentPublished({
    content: result.next.arrival.content,
    next: result.next.arrival.next,
  });
}
