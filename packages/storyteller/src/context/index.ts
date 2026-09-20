import { campaignSettingsSchema } from '@offscreen/contracts/campaign';
import { worldTimeViewSchema } from '@offscreen/game/calendar';
import { worldConditionSchema } from '@offscreen/game/world-obligations';
import {
  immediateActionPlanSchema,
  storyFactDeclarationsSchema,
} from '@offscreen/game/immediate-actions';
import { rollSchema } from '@offscreen/game/checks';
import { outcomeEffectsSchema } from '@offscreen/game/effects';
import { offerSchema } from '@offscreen/game/offers';
import { characterSchema, storyFactsSchema } from '@offscreen/game/state';
import { z } from 'zod';
import { isDeepStrictEqual } from 'node:util';
import {
  passageContentSchema,
  storyItemsSchema,
} from '@offscreen/contracts/stories';

export const storytellerCampaignSettingsSchema = campaignSettingsSchema.omit({
  time: true,
});
import { activityAccessSchema } from '@offscreen/game/immediate-actions';
import { premiseContentSchema } from './premise';
import { continuityNotesSchema } from './continuity';

export * from './continuity';
export * from './premise';

export const evidencePassageSchema = z.strictObject({
  id: z.uuid(),
  sequence: z.number().int().positive(),
  content: passageContentSchema,
  response: z.string().max(2000).nullable(),
});
export const activeSceneScopeSchema = z
  .strictObject({
    version: z.literal('active-scene.v1'),
    fromSequence: z.number().int().positive(),
    throughSequence: z.number().int().positive(),
    requiredPassageIds: z.array(z.uuid()).max(40),
  })
  .refine(
    (scope) =>
      scope.throughSequence >= scope.fromSequence &&
      scope.throughSequence - scope.fromSequence < 40,
    'Active scene scope must contain one to forty passages',
  )
  .refine(
    (scope) =>
      new Set(scope.requiredPassageIds).size ===
      scope.requiredPassageIds.length,
    'Active scene required passage IDs must be unique',
  );
export const contextInputSchema = z.strictObject({
  activeSceneScope: activeSceneScopeSchema.optional(),
  activitySituation: z
    .strictObject({
      activityAccess: activityAccessSchema,
      activeActivityId: z.uuid().nullable(),
      acceptedPlan: z
        .strictObject({
          id: z.uuid(),
          revision: z.number().int().nonnegative(),
          horizonTick: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
          nextEntry: z.strictObject({
            id: z.uuid(),
            plan: immediateActionPlanSchema.refine(
              (plan) => plan.resolution.kind === 'process',
              'Accepted plan entries must be extended activities',
            ),
          }),
        })
        .optional(),
      commitments: z
        .array(
          z.strictObject({
            activityId: z.uuid(),
            actionId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
            revision: z.number().int().nonnegative(),
            state: z.enum([
              'running',
              'paused',
              'suspended',
              'blocked',
              'encounter',
              'completion-pending',
            ]),
            label: z.string().min(1).max(200),
            progress: z.discriminatedUnion('kind', [
              z.strictObject({
                kind: z.literal('contribution'),
                label: z.string().min(1).max(120),
                earned: z.number().int().nonnegative(),
                required: z.number().int().positive(),
              }),
              z.strictObject({
                kind: z.literal('wait'),
                label: z.string().min(1).max(120),
                elapsedTicks: z.number().int().nonnegative(),
                requiredTicks: z.number().int().positive(),
              }),
            ]),
          }),
        )
        .max(20),
    })
    .optional(),
  mechanicalOpening: z
    .strictObject({
      id: z.string().regex(/^[a-z0-9][a-z0-9.-]{0,99}$/),
      character: characterSchema,
      storyFacts: storyFactsSchema.default([]),
      opening: passageContentSchema,
    })
    .optional(),
  resolution: z
    .strictObject({
      character: characterSchema,
      storyFacts: storyFactsSchema.default([]),
      tick: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
      offer: offerSchema,
      receipts: z
        .array(
          z.strictObject({
            id: z.uuid(),
            outcome: z.enum(['automatic', 'success', 'failure']).optional(),
            text: z.string().max(1000).optional(),
            roll: rollSchema.nullable(),
            effects: outcomeEffectsSchema,
            declarations: storyFactDeclarationsSchema,
          }),
        )
        .max(192),
    })
    .optional(),
  campaignSettings: storytellerCampaignSettingsSchema.optional(),
  campaignTime: worldTimeViewSchema.optional(),
  worldConditions: z.array(worldConditionSchema).max(64).optional(),
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

export function contextRequestSections(context: StorytellerContext) {
  const handle = (id: string) => {
    const passage = context.evidence.find((item) => item.id === id);
    if (!passage) {
      throw new Error('Missing continuity evidence');
    }
    return `p${passage.sequence}`;
  };
  return {
    sceneContext: {
      premise: context.premise,
      notes: context.notes.map((note) => ({
        key: note.key,
        text: note.text,
        evidence: note.sources.map(handle),
      })),
      evidence: context.evidence
        .filter((passage) => passage.id !== context.current?.id)
        .map((passage) => ({
          handle: `p${passage.sequence}`,
          content: passage.content,
          response: passage.response,
        })),
    },
    currentState: {
      ...(context.activitySituation
        ? { activitySituation: context.activitySituation }
        : {}),
      ...(context.mechanicalOpening
        ? {
            mechanicalOpening: {
              character: context.mechanicalOpening.character,
              storyFacts: context.mechanicalOpening.storyFacts,
              opening: context.mechanicalOpening.opening,
            },
          }
        : {}),
      ...(context.resolution ? { resolution: context.resolution } : {}),
      ...(context.campaignSettings
        ? { campaignSettings: context.campaignSettings }
        : {}),
      ...(context.campaignTime ? { campaignTime: context.campaignTime } : {}),
      ...(context.worldConditions
        ? { worldConditions: context.worldConditions }
        : {}),
      current: context.current
        ? {
            handle: `p${context.current.sequence}`,
            content: context.current.content,
          }
        : null,
      items: context.items,
    },
    selectedIntention: context.selected,
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
  if (context.current) {
    const current = context.current;
    const currentEvidence = context.evidence.find(
      (passage) => passage.id === current.id,
    );
    if (!isDeepStrictEqual(currentEvidence, current)) {
      throw new Error('Current passage differs from context evidence');
    }
    if (
      context.evidence.some((passage) => passage.sequence > current.sequence)
    ) {
      throw new Error('Context evidence includes a future passage');
    }
  }
  const activeScene = context.activeSceneScope;
  if (activeScene) {
    if (
      !context.current ||
      activeScene.fromSequence > activeScene.throughSequence ||
      activeScene.throughSequence !== context.current.sequence
    ) {
      throw new Error('Invalid active scene scope');
    }
    const sceneSequences = new Set(
      context.evidence
        .filter(
          (passage) =>
            passage.sequence >= activeScene.fromSequence &&
            passage.sequence <= activeScene.throughSequence,
        )
        .map((passage) => passage.sequence),
    );
    for (
      let sequence = activeScene.fromSequence;
      sequence <= activeScene.throughSequence;
      sequence++
    ) {
      if (!sceneSequences.has(sequence)) {
        throw new Error('Active scene evidence is incomplete');
      }
    }
  }
  const required = new Set(context.notes.flatMap((note) => note.sources));
  if (context.current) {
    required.add(context.current.id);
  }
  if (activeScene) {
    for (const passage of context.evidence) {
      if (
        passage.sequence >= activeScene.fromSequence &&
        passage.sequence <= activeScene.throughSequence
      ) {
        required.add(passage.id);
      }
    }
    for (const passageId of activeScene.requiredPassageIds) {
      required.add(passageId);
    }
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
