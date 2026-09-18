import { z } from 'zod';
import type { StorytellerTask, StorytellerResult } from '../tasks';
import { storytellerResultSchema, validateStorytellerResult } from '../tasks';
import authoredRehearsal from './content/narrative-rehearsal.json';
import {
  scriptedMechanicalConsequence,
  scriptedMechanicalOpening,
} from './mechanical';

const authoredSource = z
  .object({ offer: z.unknown() })
  .passthrough()
  .parse(authoredRehearsal);

function insertSharedOffer(value: unknown): unknown {
  if (value === '$offer') {
    return structuredClone(authoredSource.offer);
  }
  if (Array.isArray(value)) {
    return value.map(insertSharedOffer);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        insertSharedOffer(child),
      ]),
    );
  }
  return value;
}

const branchSchema = z.strictObject({
  result: storytellerResultSchema,
  whenNotePresent: z
    .record(z.string().min(1).max(80), storytellerResultSchema)
    .optional(),
});
const profileRehearsalSchema = z.strictObject({
  opening: storytellerResultSchema,
  continuations: z.record(z.string().min(1).max(100), branchSchema),
});
const narrativeRehearsalSchema = z.strictObject({
  version: z.literal(1),
  matchTerms: z.array(z.string().trim().min(1).max(100)).min(1).max(16),
  offer: z.unknown(),
  fallback: z.strictObject({
    opening: storytellerResultSchema,
    continuation: storytellerResultSchema,
  }),
  profiles: z.record(z.string().min(1).max(100), profileRehearsalSchema),
  sharedContinuations: z.record(z.string().min(1).max(100), branchSchema),
});

const rehearsal = narrativeRehearsalSchema.parse(
  insertSharedOffer(authoredRehearsal),
);

function selectedBranchResult(
  task: StorytellerTask,
  branch: z.infer<typeof branchSchema>,
) {
  for (const [noteKey, result] of Object.entries(
    branch.whenNotePresent ?? {},
  )) {
    if (task.context.notes.some((note) => note.key === noteKey)) {
      return result;
    }
  }
  return branch.result;
}

function scriptedNarrativeResult(task: StorytellerTask): StorytellerResult {
  const premise = task.context.premise.premise.toLocaleLowerCase('en-US');
  const matches = rehearsal.matchTerms.some((term) =>
    premise.includes(term.toLocaleLowerCase('en-US')),
  );
  const profile = matches ? rehearsal.profiles[task.profile.id] : undefined;
  if (!profile) {
    const fallback =
      task.task === 'opening'
        ? rehearsal.fallback.opening
        : rehearsal.fallback.continuation;
    return validateStorytellerResult(task, fallback);
  }
  if (task.task === 'opening') {
    return validateStorytellerResult(task, profile.opening);
  }
  const selectedId = task.context.selected?.id ?? '';
  const branch =
    profile.continuations[selectedId] ??
    rehearsal.sharedContinuations[selectedId];
  if (!branch) {
    return validateStorytellerResult(task, rehearsal.fallback.continuation);
  }
  return validateStorytellerResult(task, selectedBranchResult(task, branch));
}

/** Pure repeatable no-provider source. Authored worlds live in validated content. */
export function scriptedStorytellerResult(
  task: StorytellerTask,
): StorytellerResult {
  if (task.context.mechanicalOpening && task.task === 'opening') {
    return validateStorytellerResult(task, scriptedMechanicalOpening(task));
  }
  if (task.task === 'consequence') {
    const resolution = task.context.resolution;
    if (!resolution || !task.context.current) {
      throw new Error('Missing committed consequence');
    }
    return validateStorytellerResult(task, scriptedMechanicalConsequence(task));
  }
  return scriptedNarrativeResult(task);
}
