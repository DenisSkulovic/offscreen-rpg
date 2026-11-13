/**
 * Structural and semantic admission of generated Storyteller output.
 *
 * Provider decoding is a proposal, not game authority. This module validates
 * recorded task context and may prepare a bounded, explicitly authorized repair
 * packet, but never mutates campaign state or dispatches a model.
 */
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { capturedProviderRequestSchema } from './opening';
import { applyContinuityPatch } from '../context/continuity';
import { publishedPlayableFromGeneration } from './playable-proposal';
import {
  immediateActionAvailable,
  validateImmediateActionProposal,
} from '@offscreen/game/immediate-actions';
import {
  compileMechanicalOpeningProviderResult,
  openingProviderResultSchema,
  parseOpeningProviderResult,
  resultSchemas,
  storytellerReportResultSchema,
  storytellerResultSchema,
  type StorytellerTask,
  type StorytellerSceneTask,
  type StorytellerResult,
  type StorytellerReportResult,
  type StorytellerOutput,
} from './task-contracts.js';

export function taskEvidence(task: StorytellerTask): Record<string, string> {
  return Object.fromEntries(
    task.context.evidence.map((passage) => [
      `p${passage.sequence}`,
      passage.id,
    ]),
  );
}

function containsDeepValue(value: unknown, target: unknown): boolean {
  if (isDeepStrictEqual(value, target)) return true;
  if (Array.isArray(value)) {
    return value.some((entry) => containsDeepValue(entry, target));
  }
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).some((entry) => containsDeepValue(entry, target));
}

/** Structural/policy checks, not a claim to detect every narrative contradiction. */
export function validateStorytellerResult(
  task: Extract<StorytellerTask, { task: 'report' }>,
  output: unknown,
): StorytellerReportResult;
export function validateStorytellerResult(
  task: StorytellerSceneTask,
  output: unknown,
): StorytellerResult;
export function validateStorytellerResult(
  task: StorytellerTask,
  output: unknown,
): StorytellerOutput;
export function validateStorytellerResult(
  task: StorytellerTask,
  output: unknown,
): StorytellerOutput {
  if (task.task === 'report') {
    return storytellerReportResultSchema.parse(output);
  }
  // An opening has no earlier passage handles or private arrival. Normalize the
  // lean provider contract into the stable stored result used by publication.
  const result: StorytellerResult =
    task.task === 'opening'
      ? storytellerResultSchema.parse({
          ...(task.context.mechanicalOpening
            ? compileMechanicalOpeningProviderResult(
                output,
                task.context.mechanicalOpening.authorizedPlans ?? [],
              )
            : parseOpeningProviderResult(output, openingProviderResultSchema)),
          currentNotes: [],
          arrivalNotes: [],
        })
      : storytellerResultSchema.parse(resultSchemas[task.task].parse(output));
  if (
    result.activeScene?.kind !== 'restart-at-current' &&
    result.documentChanges.some((change) => change.recallAs)
  ) {
    throw new Error('Document recall cues require an active-scene restart');
  }
  if (result.activeScene?.kind === 'restart-at-current') {
    const recallKind = {
      identity: 'identity',
      place: 'lore',
      thread: 'narrative-thread',
    } as const;
    const campaignCatalogue = new Map(
      task.context.canonicalKnowledge?.catalogue.map((entry) => [
        entry.handle,
        entry,
      ]) ?? [],
    );
    for (const recall of result.activeScene.recallDocuments) {
      const entry = campaignCatalogue.get(recall.handle);
      if (!entry || entry.kind !== recallKind[recall.reason]) {
        throw new Error(
          'Active-scene recall must reference a compatible captured campaign document',
        );
      }
    }
    if (
      result.activeScene.recallDocuments.length +
        result.documentChanges.filter((change) => change.recallAs).length >
      8
    ) {
      throw new Error('Active-scene recall exceeds its cue limit');
    }
  }
  if (task.context.mechanicalOpening && task.task === 'opening') {
    const next = result.scene.next;
    const keys =
      next.kind === 'action-plans' ? next.plans.map((plan) => plan.key) : [];
    const labels =
      next.kind === 'action-plans'
        ? next.plans.map((plan) => plan.label.trim().toLocaleLowerCase('en-US'))
        : [];
    if (
      next.kind !== 'action-plans' ||
      next.state !== (next.plans.length ? 'available' : 'held') ||
      new Set(keys).size !== keys.length ||
      new Set(labels).size !== labels.length ||
      result.arrivalNotes.length
    ) {
      throw new Error('Invalid mechanical opening plans');
    }
    for (const plan of next.plans) {
      const suppliedPlan =
        task.context.mechanicalOpening.authorizedPlans?.some((candidate) =>
          isDeepStrictEqual(candidate, plan),
        ) ?? false;
      const validation = validateImmediateActionProposal({
        proposal: plan,
        character: task.context.mechanicalOpening.character,
        storyFacts: task.context.mechanicalOpening.storyFacts,
        evidenceHandles: new Set(),
        requireFactTransitionDeclarations: !suppliedPlan,
        allowWorldEffects: suppliedPlan,
      });
      if (validation.kind === 'rejected') {
        throw new Error(`Invalid opening plan: ${validation.issues[0]?.code}`);
      }
      if (
        !immediateActionAvailable(
          task.context.mechanicalOpening.character,
          task.context.mechanicalOpening.storyFacts,
          validation.plan,
        )
      ) {
        throw new Error('Opening plan is unavailable in captured state');
      }
    }
  }
  if (task.task === 'consequence' || task.task === 'pending-consequence') {
    const resolution = task.context.resolution;
    const next = result.scene.next;
    if (
      !resolution ||
      result.scene.version !== 3 ||
      next.kind !== 'action-plans' ||
      result.arrivalNotes.length
    ) {
      throw new Error('Invalid consequence narration');
    }
    const keys = next.plans.map((plan) => plan.key);
    const labels = next.plans.map((plan) =>
      plan.label.trim().toLocaleLowerCase('en-US'),
    );
    if (
      next.state !== (next.plans.length ? 'available' : 'held') ||
      new Set(keys).size !== keys.length ||
      new Set(labels).size !== labels.length
    ) {
      throw new Error('Invalid planned opportunities');
    }
    const evidenceHandles = new Set(Object.keys(taskEvidence(task)));
    for (const plan of next.plans) {
      const validation = validateImmediateActionProposal({
        proposal: plan,
        character: resolution.character,
        storyFacts: resolution.storyFacts,
        evidenceHandles,
        requireFactTransitionDeclarations: true,
        allowWorldEffects: false,
      });
      if (validation.kind === 'rejected') {
        const first = validation.issues[0];
        throw new Error(
          `Invalid action plan: ${first?.code ?? 'unknown'} at ${first?.path || '<root>'}: ${first?.message ?? 'no diagnostic'}`,
        );
      }
      if (
        !immediateActionAvailable(
          resolution.character,
          resolution.storyFacts,
          validation.plan,
        )
      ) {
        throw new Error('Action plan is unavailable in captured state');
      }
    }
    for (const effect of resolution.receipts.flatMap(
      (receipt) => receipt.effects,
    )) {
      if (
        next.plans.length > 0 &&
        next.plans.every((plan) => containsDeepValue(plan.resolution, effect))
      ) {
        throw new Error(
          'Fresh action plans cannot all replay an already settled receipt effect',
        );
      }
    }
  }
  const expectedVersion =
    task.task === 'consequence' || task.task === 'pending-consequence'
      ? 3
      : task.task === 'opening'
        ? 1
        : 2;
  if (result.scene.version !== expectedVersion) {
    throw new Error('Wrong task output version');
  }
  const slices = [result.scene.next];
  if (result.scene.next.kind === 'interval') {
    slices.push(result.scene.next.arrival.next);
  } else if (result.arrivalNotes.length) {
    throw new Error('Arrival notes require an interval');
  }
  for (const next of slices) {
    if (next.kind === 'end') {
      throw new Error('Continuing life cannot end automatically');
    }
    if (next.kind !== 'choice') {
      continue;
    }
    const worldSectionHandles = new Set(
      task.context.canonicalKnowledge?.libraries
        .filter((library) => library.kind === 'world')
        .flatMap((library) =>
          library.catalogue.flatMap((document) =>
            document.sections.map((section) => section.handle),
          ),
        ) ?? [],
    );
    const campaignDocumentHandles = new Set(
      task.context.canonicalKnowledge?.catalogue.map((entry) => entry.handle) ??
        [],
    );
    for (const option of next.options) {
      if (
        (option.worldSections ?? []).some(
          (handle) => !worldSectionHandles.has(handle),
        )
      ) {
        throw new Error(
          'Choice world sections must reference the captured world catalogue',
        );
      }
      if (
        (option.campaignDocuments ?? []).some(
          (handle) => !campaignDocumentHandles.has(handle),
        )
      ) {
        throw new Error(
          'Choice campaign documents must reference the captured campaign catalogue',
        );
      }
      if (
        (option.createdDocuments ?? []).some(
          (index) => result.documentChanges[index] === undefined,
        )
      ) {
        throw new Error(
          'Choice created documents must reference this result document changes',
        );
      }
    }
    const labels = next.options.map((option) =>
      option.label.trim().toLocaleLowerCase('en-US'),
    );
    if (
      (task.task !== 'consequence' &&
        task.task !== 'pending-consequence' &&
        !task.context.mechanicalOpening &&
        (next.options.length < 2 || next.options.length > 5)) ||
      new Set(labels).size !== labels.length
    ) {
      throw new Error('Offer must contain 2-5 distinct choices');
    }
  }
  const evidence = taskEvidence(task);
  // Temporary identities validate patch references before real passage IDs exist.
  const current = '00000000-0000-4000-8000-000000000001';
  const arrival = '00000000-0000-4000-8000-000000000002';
  const notes = applyContinuityPatch({
    notes: task.context.notes,
    patch: result.currentNotes,
    evidence: { ...evidence, current },
    revision: 1,
  });
  if (result.scene.next.kind === 'interval') {
    applyContinuityPatch({
      notes,
      patch: result.arrivalNotes,
      evidence: { ...evidence, current, arrival },
      revision: 2,
    });
  }
  return result;
}

export function publishedStorytellerSlice(
  output: unknown,
  sourcePart: 'current' | 'arrival',
) {
  const result = storytellerResultSchema.parse(output);
  return publishedPlayableFromGeneration({
    output: result.scene,
    sourcePart,
  });
}

export const storytellerOutputDiagnosticSchema = z.strictObject({
  issues: z
    .array(
      z.strictObject({
        path: z.string().max(300),
        code: z.string().max(80),
        message: z.string().max(500),
      }),
    )
    .min(1)
    .max(12),
});
export type StorytellerOutputDiagnostic = z.infer<
  typeof storytellerOutputDiagnosticSchema
>;

/** Compact private repair evidence; never substitutes for ordinary validation. */
export function diagnoseStorytellerResult(
  task: StorytellerTask,
  output: unknown,
): StorytellerOutputDiagnostic | null {
  try {
    validateStorytellerResult(task, output);
    return null;
  } catch (error) {
    const issues =
      error instanceof z.ZodError
        ? error.issues.slice(0, 12).map((issue) => ({
            path: issue.path.map(String).join('.').slice(0, 300),
            code: issue.code.slice(0, 80),
            message: issue.message.slice(0, 500),
          }))
        : [
            {
              path: '',
              code: 'storyteller_policy',
              message:
                error instanceof Error
                  ? error.message.slice(0, 500)
                  : 'Storyteller output failed policy validation',
            },
          ];
    return storytellerOutputDiagnosticSchema.parse({ issues });
  }
}

/**
 * Builds a minimal complete-result correction packet. The invalid candidate is
 * private data; original system rules and output schema remain authoritative.
 */
export function prepareStorytellerRepairRequest(input: {
  task: StorytellerTask;
  candidate: unknown;
  diagnostic: StorytellerOutputDiagnostic;
}) {
  if (input.task.resources.recipe.version !== 'repairable-turn.v1') {
    throw new Error('Storyteller task does not admit repair');
  }
  const diagnostic = storytellerOutputDiagnosticSchema.parse(input.diagnostic);
  return capturedProviderRequestSchema.parse({
    messages: [
      input.task.request.messages[0],
      {
        role: 'user',
        content: [
          'The previous candidate failed deterministic validation.',
          'Return one complete corrected replacement matching the supplied output schema.',
          'Preserve every valid field exactly and change only what the validator findings require.',
          'Do not add commentary, wrappers, alternatives or a second candidate.',
          `Validator findings: ${JSON.stringify(diagnostic)}`,
          `Invalid candidate: ${JSON.stringify(input.candidate)}`,
        ].join('\n'),
      },
    ],
    outputSchema: input.task.request.outputSchema,
  });
}
