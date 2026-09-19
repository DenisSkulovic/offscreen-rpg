import { z } from 'zod';
import {
  checkPlanSchema,
  checkResolutionSchema,
  resolveCheck,
  type DrawD20,
} from './checks';
import { outcomeEffectsSchema } from './effects';
import { factSchema, type Character } from './state';

const outcomeSchema = z.strictObject({
  text: z.string().min(1).max(1000),
  effects: outcomeEffectsSchema,
  interrupts: z.boolean().default(false),
});
export const scheduledCheckSchema = z.strictObject({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  everyTicks: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  resolution: checkResolutionSchema,
  success: outcomeSchema,
  failure: outcomeSchema,
});
const contributionProcessSchema = z.strictObject({
  kind: z.literal('contribution.v1'),
  progressLabel: z.string().min(1).max(120),
  requiredContribution: z
    .number()
    .int()
    .positive()
    .max(Number.MAX_SAFE_INTEGER),
  everyTicks: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  attempt: z.strictObject({
    check: checkPlanSchema,
    successContribution: z
      .number()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER),
    failureContribution: z
      .number()
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER),
    successText: z.string().min(1).max(1000),
    failureText: z.string().min(1).max(1000),
  }),
});
const clockWaitProcessSchema = z.strictObject({
  kind: z.literal('clock-wait.v1'),
  progressLabel: z.string().min(1).max(120),
  requiredTicks: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});
export const activityOccurrencePolicySchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('unbounded') }),
  z.strictObject({
    kind: z.literal('limited'),
    scopeKey: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
    limit: z.number().int().positive().max(1000),
  }),
]);
export const activityConditionPolicySchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('admission-only') }),
  z.strictObject({
    kind: z.literal('boundary'),
    blockedText: z.string().min(1).max(500),
  }),
]);
export const activityOccurrencesSchema = z
  .array(
    z.strictObject({
      scopeKey: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
      completed: z.number().int().nonnegative().max(1000),
    }),
  )
  .max(64)
  .refine(
    (occurrences) =>
      new Set(occurrences.map((occurrence) => occurrence.scopeKey)).size ===
      occurrences.length,
    'Duplicate activity occurrence scope',
  );
export type ActivityOccurrences = z.infer<typeof activityOccurrencesSchema>;
export const processDefinitionSchema = z.discriminatedUnion('kind', [
  contributionProcessSchema,
  clockWaitProcessSchema,
]);

export const actionDefinitionSchema = z.strictObject({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  label: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  requires: z.array(factSchema).max(16),
  capacity: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  process: processDefinitionSchema,
  conditionPolicy: activityConditionPolicySchema,
  occurrence: activityOccurrencePolicySchema,
  completionFollowUp: z.enum(['quiet', 'scene']),
  checks: z.array(scheduledCheckSchema).max(8),
  completion: outcomeSchema.omit({ interrupts: true }),
});
export const actionContentSchema = z
  .strictObject({
    version: z.literal(2),
    id: z.string().min(1).max(100),
    actions: z.array(actionDefinitionSchema).min(1).max(6),
  })
  .superRefine((content, context) => {
    if (
      new Set(content.actions.map((action) => action.id)).size !==
      content.actions.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Duplicate action identity',
      });
    }
    for (const action of content.actions) {
      if (action.checks.some((check) => check.id === 'process-contribution')) {
        context.addIssue({
          code: 'custom',
          message:
            'Scheduled check identity is reserved by the process runtime',
        });
      }
      if (
        new Set(action.checks.map((check) => check.id)).size !==
        action.checks.length
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Duplicate schedule identity',
        });
      }
    }
  });
export type ActionContent = z.infer<typeof actionContentSchema>;
export type ActionDefinition = z.infer<typeof actionDefinitionSchema>;

export function activityOccurrenceAvailable(
  occurrences: ActivityOccurrences,
  action: ActionDefinition,
) {
  if (action.occurrence.kind === 'unbounded') return true;
  const policy = action.occurrence;
  const completed =
    occurrences.find((occurrence) => occurrence.scopeKey === policy.scopeKey)
      ?.completed ?? 0;
  return completed < policy.limit;
}

/** Records a terminal completion; starting, suspending and abandoning never spend it. */
export function recordActivityOccurrence(
  occurrences: ActivityOccurrences,
  action: ActionDefinition,
): ActivityOccurrences {
  if (action.occurrence.kind === 'unbounded') return occurrences;
  const policy = action.occurrence;
  if (!activityOccurrenceAvailable(occurrences, action)) {
    throw new Error('Activity occurrence limit already reached');
  }
  const existing = occurrences.find(
    (occurrence) => occurrence.scopeKey === policy.scopeKey,
  );
  return activityOccurrencesSchema.parse(
    existing
      ? occurrences.map((occurrence) =>
          occurrence.scopeKey === policy.scopeKey
            ? { ...occurrence, completed: occurrence.completed + 1 }
            : occurrence,
        )
      : [...occurrences, { scopeKey: policy.scopeKey, completed: 1 }],
  );
}

export function actionAvailable(
  character: Character,
  action: ActionDefinition,
) {
  return action.requires.every((required) =>
    character.facts.some(
      (fact) => fact.id === required.id && fact.value === required.value,
    ),
  );
}

export function activityBoundaryBlockText(
  character: Character,
  action: ActionDefinition,
) {
  if (action.conditionPolicy.kind !== 'boundary') return null;
  return actionAvailable(character, action)
    ? null
    : action.conditionPolicy.blockedText;
}

/** Content cannot refer to state it never declared. */
export function validateContentState(
  content: ActionContent,
  character: Character,
) {
  for (const action of content.actions) {
    if (action.process.kind === 'contribution.v1') {
      const contributionCheck = action.process.attempt.check;
      if (!character.applicableAbilities.includes(contributionCheck.ability)) {
        throw new Error(
          'Contribution ability is not applicable to the current form',
        );
      }
      if (
        contributionCheck.skill &&
        !character.skills.some((skill) => skill.id === contributionCheck.skill)
      ) {
        throw new Error(
          'Contribution skill is not declared on the current form',
        );
      }
    }
    for (const required of action.requires) {
      if (
        !character.facts.some(
          (fact) =>
            fact.id === required.id &&
            typeof fact.value === typeof required.value,
        )
      ) {
        throw new Error('Prerequisite references an undeclared fact');
      }
    }
    const effects = [
      action.completion.effects,
      ...action.checks.flatMap((schedule) => [
        schedule.success.effects,
        schedule.failure.effects,
      ]),
    ].flat();
    for (const effect of effects) {
      if (effect.kind === 'fact.set.v1') {
        if (
          !character.facts.some(
            (fact) =>
              fact.id === effect.fact.id &&
              typeof fact.value === typeof effect.fact.value,
          )
        ) {
          throw new Error('Outcome references an undeclared fact');
        }
      } else if (
        !character.quantities.some(
          (quantity) => quantity.id === effect.quantityId,
        )
      ) {
        throw new Error('Outcome references an undeclared quantity');
      }
    }
  }
}

export const resolvedActivityPlanSchema = z.strictObject({
  version: z.literal(6),
  action: actionDefinitionSchema,
  settingsRevision: z.number().int().positive(),
  resolvedThroughTick: z.number().int().nonnegative().default(0),
});
export type ResolvedActivityPlan = z.infer<typeof resolvedActivityPlanSchema>;

export const contributionProgressSchema = z.strictObject({
  kind: z.literal('contribution.v1'),
  earned: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});
export type ContributionProgress = z.infer<typeof contributionProgressSchema>;
export const clockWaitProgressSchema = z.strictObject({
  kind: z.literal('clock-wait.v1'),
  elapsedTicks: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});
export type ClockWaitProgress = z.infer<typeof clockWaitProgressSchema>;
export const processProgressSchema = z.discriminatedUnion('kind', [
  contributionProgressSchema,
  clockWaitProgressSchema,
]);
export const activityProgressSchema = z.strictObject({
  effortTicks: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  process: processProgressSchema,
  completionPending: z.boolean().default(false),
});
export type ActivityProgress = z.infer<typeof activityProgressSchema>;

export function initialActivityProgress(action: ActionDefinition) {
  return activityProgressSchema.parse({
    effortTicks: 0,
    process:
      action.process.kind === 'contribution.v1'
        ? { kind: 'contribution.v1', earned: 0 }
        : { kind: 'clock-wait.v1', elapsedTicks: 0 },
    completionPending: false,
  });
}

function abilityCheckSuccessChance(
  character: Character,
  plan: ActionDefinition,
) {
  if (plan.process.kind !== 'contribution.v1') {
    throw new Error('Completion chance requires a contribution rule');
  }
  const check = plan.process.attempt.check;
  const abilityModifier = Math.floor(
    (character.scores[check.ability] - 10) / 2,
  );
  const proficiencyModifier =
    check.skill && character.proficientSkills.includes(check.skill)
      ? character.proficiencyBonus
      : 0;
  const modifier =
    abilityModifier +
    proficiencyModifier +
    check.modifiers.reduce((sum, entry) => sum + entry.value, 0);
  let successes = 0;
  let outcomes = 0;
  const usesTwoDice = check.advantage !== check.disadvantage;
  for (let first = 1; first <= 20; first++) {
    for (let second = 1; second <= (usesTwoDice ? 20 : 1); second++) {
      const chosen =
        check.advantage && !check.disadvantage
          ? Math.max(first, second)
          : check.disadvantage && !check.advantage
            ? Math.min(first, second)
            : first;
      successes += chosen + modifier >= check.dc ? 1 : 0;
      outcomes++;
    }
  }
  return successes / outcomes;
}

/** Conditional projection only; never use this value to award progress. */
export function estimatedCompletionBoundaryTick(
  plan: ResolvedActivityPlan,
  progress: ContributionProgress | ClockWaitProgress,
  character: Character,
) {
  if (plan.action.process.kind === 'clock-wait.v1') {
    if (progress.kind !== 'clock-wait.v1') {
      throw new Error('Activity progress does not match its process rule');
    }
    return Math.max(
      plan.resolvedThroughTick,
      plan.action.process.requiredTicks,
    );
  }
  if (progress.kind !== 'contribution.v1') {
    throw new Error('Activity progress does not match its process rule');
  }
  const remaining = Math.max(
    0,
    plan.action.process.requiredContribution - progress.earned,
  );
  const successChance = abilityCheckSuccessChance(character, plan.action);
  const attempt = plan.action.process.attempt;
  const expectedContribution =
    successChance * attempt.successContribution +
    (1 - successChance) * attempt.failureContribution;
  if (expectedContribution <= 0) {
    return null;
  }
  const boundariesRemaining = Math.ceil(remaining / expectedContribution);
  if (boundariesRemaining === 0) {
    return plan.resolvedThroughTick;
  }
  const cadence = plan.action.process.everyTicks;
  const nextBoundary =
    (Math.floor(plan.resolvedThroughTick / cadence) + 1) * cadence;
  return nextBoundary + (boundariesRemaining - 1) * cadence;
}

/**
 * Settle productive progress at one already-due clock boundary. Elapsed time
 * never enters this policy: it only determines when the caller may invoke it.
 */
export function contributeAtBoundary(
  plan: ResolvedActivityPlan,
  progress: ContributionProgress,
  character: Character,
  drawD20: DrawD20,
) {
  if (plan.action.process.kind !== 'contribution.v1') {
    throw new Error('Contribution settlement requires a contribution rule');
  }
  const roll = resolveCheck(
    character,
    plan.action.process.attempt.check,
    drawD20,
  );
  const attempt = plan.action.process.attempt;
  const contribution = roll.success
    ? attempt.successContribution
    : attempt.failureContribution;
  const earned = Math.min(
    plan.action.process.requiredContribution,
    progress.earned + contribution,
  );
  return {
    progress: { kind: 'contribution.v1', earned } as const,
    complete: earned === plan.action.process.requiredContribution,
    contribution,
    text: roll.success ? attempt.successText : attempt.failureText,
    roll,
  };
}

export function processBoundaryDue(
  plan: ResolvedActivityPlan,
  boundaryTick: number,
) {
  const process = plan.action.process;
  return process.kind === 'contribution.v1'
    ? boundaryTick % process.everyTicks === 0
    : boundaryTick === process.requiredTicks;
}

/** Reflect eligible clock effort without confusing it with contribution. */
export function processProgressAtEffortTick(
  plan: ResolvedActivityPlan,
  progress: ActivityProgress['process'],
  effortTick: number,
) {
  if (plan.action.process.kind === 'contribution.v1') {
    if (progress.kind !== 'contribution.v1') {
      throw new Error('Activity progress does not match its process rule');
    }
    return progress;
  }
  if (progress.kind !== 'clock-wait.v1') {
    throw new Error('Activity progress does not match its process rule');
  }
  return {
    kind: 'clock-wait.v1' as const,
    elapsedTicks: Math.min(plan.action.process.requiredTicks, effortTick),
  };
}

/** Settle exactly one due process boundary without persistence or follow-up work. */
export function settleProcessBoundary(
  plan: ResolvedActivityPlan,
  progress: ActivityProgress['process'],
  character: Character,
  drawD20: DrawD20,
) {
  if (plan.action.process.kind === 'contribution.v1') {
    if (progress.kind !== 'contribution.v1') {
      throw new Error('Activity progress does not match its process rule');
    }
    return contributeAtBoundary(plan, progress, character, drawD20);
  }
  if (progress.kind !== 'clock-wait.v1') {
    throw new Error('Activity progress does not match its process rule');
  }
  const elapsedTicks = plan.action.process.requiredTicks;
  return {
    progress: { kind: 'clock-wait.v1', elapsedTicks } as const,
    complete: true,
    contribution: null,
    text: null,
    roll: null,
  };
}

/** Skip quiet ticks while preserving the earliest due mechanical boundary. */
export function nextBoundaryTick(
  plan: ResolvedActivityPlan,
  cursorTick: number,
) {
  const process = plan.action.process;
  let next =
    process.kind === 'contribution.v1'
      ? (BigInt(cursorTick) / BigInt(process.everyTicks) + 1n) *
        BigInt(process.everyTicks)
      : BigInt(process.requiredTicks);
  for (const schedule of plan.action.checks) {
    const cadence = BigInt(schedule.everyTicks);
    const candidate = (BigInt(cursorTick) / cadence + 1n) * cadence;
    if (candidate < next) {
      next = candidate;
    }
  }
  return Number(next);
}

/** Map a local effort boundary onto the campaign timeline, including backlog. */
export function worldTickForEffortBoundary(input: {
  campaignTick: number;
  retainedEffortTicks: number;
  boundaryEffortTick: number;
}) {
  const worldTick =
    input.campaignTick + (input.boundaryEffortTick - input.retainedEffortTicks);
  if (!Number.isSafeInteger(worldTick) || worldTick < 0) {
    throw new Error('Campaign tick is outside the supported range');
  }
  return worldTick;
}
