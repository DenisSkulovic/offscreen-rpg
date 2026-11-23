import { z } from 'zod';

const reference = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const label = z
  .string()
  .max(500)
  .refine((value) => value.trim().length > 0);

/** Offered identities and presentation only; consequences remain server-side. */
export const choiceSpecificationSchema = z
  .strictObject({
    kind: z.literal('choice.v1'),
    prompt: z
      .string()
      .max(2000)
      .refine((value) => value.trim().length > 0),
    options: z
      .array(
        z.strictObject({
          id: reference,
          label,
          description: z.string().max(2000).optional(),
          risk: z.string().min(1).max(300).nullable().optional(),
        }),
      )
      .min(1)
      .max(100),
  })
  .superRefine((value, context) => {
    const seen = new Set<string>();
    value.options.forEach((option, index) => {
      if (seen.has(option.id))
        context.addIssue({
          code: 'custom',
          path: ['options', index, 'id'],
          message: 'Option identities must be unique',
        });
      seen.add(option.id);
    });
  });

// Add supported formats here with their own validators. Unknown kinds fail
// closed; this is not an arbitrary JSON or executable form-definition protocol.
export const interactionSpecificationSchema = z.discriminatedUnion('kind', [
  choiceSpecificationSchema,
]);
export const interactionSchema = z.strictObject({
  id: z.uuid(),
  specification: interactionSpecificationSchema,
});

const choiceAnswerSchema = z.strictObject({
  kind: z.literal('choice.v1'),
  optionId: reference,
});
export const interactionAnswerSchema = z.discriminatedUnion('kind', [
  choiceAnswerSchema,
]);
export const interactionSubmissionSchema = z.strictObject({
  interactionId: z.uuid(),
  answer: interactionAnswerSchema,
});

export type InteractionSpecification = z.infer<
  typeof interactionSpecificationSchema
>;
export type Interaction = z.infer<typeof interactionSchema>;
export type InteractionSubmission = z.infer<typeof interactionSubmissionSchema>;

export class InteractionInputError extends Error {
  constructor(
    readonly code: 'invalid_answer' | 'stale_interaction' | 'unoffered_option',
  ) {
    super(code);
  }
}

/** Validate against the server's current offer, never an offer from the client.
 * This does not authorize an actor, admit before a deadline or commit effects.
 */
export function validateInteractionSubmission(
  current: unknown,
  submitted: unknown,
): InteractionSubmission {
  const offer = interactionSchema.parse(current);
  const parsed = interactionSubmissionSchema.safeParse(submitted);
  if (!parsed.success) throw new InteractionInputError('invalid_answer');
  const submission = parsed.data;
  if (submission.interactionId !== offer.id)
    throw new InteractionInputError('stale_interaction');
  // A new format must implement both shape and offered-content validation here.
  if (
    !offer.specification.options.some(
      (option) => option.id === submission.answer.optionId,
    )
  )
    throw new InteractionInputError('unoffered_option');
  return submission;
}
