import { z } from 'zod';
import { checkPlanSchema } from './checks';
import { outcomeEffectsSchema } from './effects';
import { factSchema, type Character } from './state';

const actionKeySchema = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const outcomeSchema = z.strictObject({
  text: z.string().min(1).max(1000),
  effects: outcomeEffectsSchema,
});
type ImmediateOutcome = z.infer<typeof outcomeSchema>;

export const immediateActionPlanSchema = z.strictObject({
  version: z.literal(1),
  key: actionKeySchema,
  label: z.string().min(1).max(200),
  intention: z.string().min(1).max(500),
  risk: z.string().min(1).max(300).nullable(),
  evidence: z.array(z.string().min(1).max(100)).max(8),
  requires: z.array(factSchema).max(16),
  resolution: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('automatic'), outcome: outcomeSchema }),
    z.strictObject({
      kind: z.literal('check'),
      check: checkPlanSchema,
      difficultyBasis: z.string().min(1).max(300),
      success: outcomeSchema,
      failure: outcomeSchema,
    }),
  ]),
});
export type ImmediateActionPlan = z.infer<typeof immediateActionPlanSchema>;

export const immediateActionContentSchema = z
  .strictObject({
    version: z.literal(1),
    id: z.string().min(1).max(100),
    plans: z.array(immediateActionPlanSchema).max(6),
  })
  .superRefine((content, context) => {
    if (new Set(content.plans.map((plan) => plan.key)).size !== content.plans.length) {
      context.addIssue({ code: 'custom', message: 'Duplicate action key' });
    }
  });
export type ImmediateActionContent = z.infer<typeof immediateActionContentSchema>;

export const actionProposalIssueSchema = z.strictObject({
  code: z.enum([
    'invalid-shape',
    'duplicate-evidence',
    'unknown-evidence',
    'unknown-fact',
    'unknown-quantity',
    'unavailable-ability',
    'unknown-skill',
    'unsupported-modifier',
  ]),
  path: z.string().max(300),
  message: z.string().max(500),
});
export type ActionProposalIssue = z.infer<typeof actionProposalIssueSchema>;
export type ImmediateActionValidation =
  | Readonly<{ kind: 'accepted'; plan: ImmediateActionPlan }>
  | Readonly<{ kind: 'rejected'; issues: readonly ActionProposalIssue[] }>;

function issue(
  issues: ActionProposalIssue[],
  code: ActionProposalIssue['code'],
  path: string,
  message: string,
) {
  issues.push(actionProposalIssueSchema.parse({ code, path, message }));
}

/** Pure admission diagnostics shared by fixtures, the future planner tool and publication. */
export function validateImmediateActionProposal(input: {
  proposal: unknown;
  character: Character;
  evidenceHandles: ReadonlySet<string>;
}): ImmediateActionValidation {
  const parsed = immediateActionPlanSchema.safeParse(input.proposal);
  if (!parsed.success) {
    return {
      kind: 'rejected',
      issues: parsed.error.issues.slice(0, 16).map((problem) => ({
        code: 'invalid-shape',
        path: problem.path.join('.'),
        message: problem.message.slice(0, 500),
      })),
    };
  }
  const plan = parsed.data;
  const issues: ActionProposalIssue[] = [];
  if (new Set(plan.evidence).size !== plan.evidence.length) {
    issue(issues, 'duplicate-evidence', 'evidence', 'Evidence handles must be unique');
  }
  for (const [index, handle] of plan.evidence.entries()) {
    if (!input.evidenceHandles.has(handle)) {
      issue(issues, 'unknown-evidence', `evidence.${index}`, 'Evidence is outside the captured task');
    }
  }
  const knownFacts = new Map(
    input.character.facts.map((fact) => [fact.id, typeof fact.value]),
  );
  const knownQuantities = new Set(
    input.character.quantities.map((quantity) => quantity.id),
  );
  for (const [index, required] of plan.requires.entries()) {
    if (knownFacts.get(required.id) !== typeof required.value) {
      issue(issues, 'unknown-fact', `requires.${index}`, 'Prerequisite fact is not declared with this value type');
    }
  }
  if (plan.resolution.kind === 'check') {
    const check = plan.resolution.check;
    if (!input.character.applicableAbilities.includes(check.ability)) {
      issue(
        issues,
        'unavailable-ability',
        'resolution.check.ability',
        'The check ability is not applicable to the current form',
      );
    }
    if (
      check.skill &&
      !input.character.skills.some((skill) => skill.id === check.skill)
    ) {
      issue(
        issues,
        'unknown-skill',
        'resolution.check.skill',
        'The check skill is not declared on the current form',
      );
    }
    if (check.advantage || check.disadvantage || check.modifiers.length) {
      issue(
        issues,
        'unsupported-modifier',
        'resolution.check',
        'The first immediate-action contract does not admit situational modifiers',
      );
    }
  }
  const outcomes: Array<readonly [string, ImmediateOutcome]> =
    plan.resolution.kind === 'automatic'
      ? [['outcome', plan.resolution.outcome]]
      : [
          ['success', plan.resolution.success],
          ['failure', plan.resolution.failure],
        ];
  for (const [outcomeKey, outcome] of outcomes) {
    for (const [effectIndex, effect] of outcome.effects.entries()) {
      const path = `resolution.${outcomeKey}.effects.${effectIndex}`;
      if (effect.kind === 'fact.set.v1') {
        if (knownFacts.get(effect.fact.id) !== typeof effect.fact.value) {
          issue(issues, 'unknown-fact', path, 'Outcome fact is not declared with this value type');
        }
      } else if (!knownQuantities.has(effect.quantityId)) {
        issue(issues, 'unknown-quantity', path, 'Outcome quantity is not declared');
      }
    }
  }
  return issues.length ? { kind: 'rejected', issues } : { kind: 'accepted', plan };
}

export function immediateActionAvailable(
  character: Character,
  plan: ImmediateActionPlan,
) {
  return plan.requires.every((required) =>
    character.facts.some(
      (fact) => fact.id === required.id && fact.value === required.value,
    ),
  );
}

/** A plan may currently write only state whose identity and value type are declared. */
export function validateImmediateActionState(
  content: ImmediateActionContent,
  character: Character,
) {
  for (const plan of content.plans) {
    const result = validateImmediateActionProposal({
      proposal: plan,
      character,
      evidenceHandles: new Set(plan.evidence),
    });
    if (result.kind === 'rejected') {
      throw new Error(result.issues[0]?.message ?? 'Invalid immediate action');
    }
  }
}
