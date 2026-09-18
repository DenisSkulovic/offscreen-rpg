import { z } from 'zod';
import type { StorytellerTask, StorytellerResult } from '../tasks';
import {
  storytellerResultSchema,
  validateStorytellerResult,
} from '../tasks';
import authoredRehearsal from './content/narrative-rehearsal.json';

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
  sharedContinuations: z.record(
    z.string().min(1).max(100),
    branchSchema,
  ),
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
    return validateStorytellerResult(
      task,
      rehearsal.fallback.continuation,
    );
  }
  return validateStorytellerResult(
    task,
    selectedBranchResult(task, branch),
  );
}

/** Pure repeatable no-provider source. Authored worlds live in validated content. */
export function scriptedStorytellerResult(
  task: StorytellerTask,
): StorytellerResult {
  if (task.context.mechanicalOpening && task.task === 'opening') {
    const opening = task.context.mechanicalOpening;
    return validateStorytellerResult(task, {
      version: 1,
      scene: {
        version: 1,
        content: opening.opening,
        next: {
          kind: 'choice',
          prompt: 'What do you attempt?',
          options: opening.offer.nodes.map((node) => ({
            id: node.id,
            label: node.label,
            intention: node.description,
          })),
        },
      },
      currentNotes: [],
      arrivalNotes: [],
    });
  }
  if (task.task === 'consequence') {
    const resolution = task.context.resolution;
    if (!resolution || !task.context.current) {
      throw new Error('Missing committed consequence');
    }
    const candidates = resolution.offer.nodes.filter((node) => node.action);
    const alternatives = candidates.filter(
      (node) => node.id !== task.context.selected?.id,
    );
    const selected = (alternatives.length ? alternatives : candidates).slice(
      0,
      3,
    );
    return validateStorytellerResult(task, {
      version: 1,
      scene: {
        version: 3,
        content: task.context.current.content,
        next: {
          kind: 'opportunities',
          state: selected.length ? 'available' : 'held',
          options: selected.map((node) => ({
            id: node.id,
            label: node.label,
            intention: node.description,
          })),
        },
      },
      currentNotes: [],
      arrivalNotes: [],
    });
  }
  return scriptedNarrativeResult(task);
}
