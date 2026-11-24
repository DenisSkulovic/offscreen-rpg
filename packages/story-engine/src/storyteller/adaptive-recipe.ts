/**
 * SA06: intersect TaskEvidenceNeed with effective usage policy to pick a recipe.
 * Premium allowance alone never selects memory exploration.
 */
import type { EffectiveUsagePolicy } from '@offscreen/usage-policy/usage-policy';
import type {
  CreativeExplorationLimits,
  CreativeExplorationPosture,
} from '@offscreen/storyteller/context/creative-exploration';
import type { StorytellerRecipeDecision } from '@offscreen/storyteller/tasks';
import {
  assessTaskEvidenceNeed,
  type TaskEvidenceNeed,
  type TaskEvidenceNeedInput,
} from './task-evidence-need';

export type AdmittedRecipeCreativeInput = Readonly<{
  posture: CreativeExplorationPosture;
  requested?: Partial<CreativeExplorationLimits>;
  maxRepairRounds?: 0 | 1;
}>;

export type AdmittedRecipeSelection = Readonly<{
  creativeInput: AdmittedRecipeCreativeInput | undefined;
  decision: StorytellerRecipeDecision;
  hold: null | Readonly<{ code: string; reason: string }>;
}>;

function explorationAuthorized(policy: EffectiveUsagePolicy) {
  return (
    policy.limits.maxModelRoundsPerOperation > 1 &&
    policy.limits.maxReadsPerOperation > 0 &&
    policy.limits.maxRetainedReadBytes >= 1024
  );
}

function needsInvestigation(need: TaskEvidenceNeed) {
  return (
    need.missingExactSourceRefs.length > 0 ||
    need.olderNamedEntityRefs.length > 0 ||
    (need.activeSceneNeedsHistory && !need.alreadyResolvedByLoadedSource) ||
    need.creativePreference !== 'off'
  );
}

/**
 * Deterministic recipe intent. Explicit creativeInput from callers still wins at
 * admission; this selector runs only when admission asks for an adaptive choice.
 */
export function selectAdmittedRecipeIntent(input: {
  need: TaskEvidenceNeed;
  policy: EffectiveUsagePolicy;
  taskKind:
    | 'opening'
    | 'continuation'
    | 'consequence'
    | 'pending-consequence'
    | 'report';
}): AdmittedRecipeSelection {
  const need = input.need;
  const reasons = [...need.reasons];

  if (input.taskKind === 'report') {
    reasons.push('report_task_forces_single_turn');
    return {
      creativeInput: undefined,
      decision: {
        version: 'storyteller-recipe-decision.v1',
        selectedRecipeFamily: 'single-turn',
        reasons,
        evidenceNeedVersion: 'task-evidence-need.v1',
        mandatoryComplete: need.mandatoryComplete,
        missingExactSourceRefs: need.missingExactSourceRefs,
        creativePreference: need.creativePreference,
      },
      hold: null,
    };
  }

  const investigate = needsInvestigation(need);
  const canExplore = explorationAuthorized(input.policy);

  if (investigate && canExplore) {
    const posture: CreativeExplorationPosture =
      need.creativePreference === 'off' ? 'minimal' : need.creativePreference;
    reasons.push('select_memory_exploration_for_structured_need');
    reasons.push(`exploration_posture_${posture}`);
    return {
      creativeInput: {
        posture,
        maxRepairRounds: 0,
      },
      decision: {
        version: 'storyteller-recipe-decision.v1',
        selectedRecipeFamily: 'memory-exploration',
        reasons,
        evidenceNeedVersion: 'task-evidence-need.v1',
        mandatoryComplete: need.mandatoryComplete,
        missingExactSourceRefs: need.missingExactSourceRefs,
        creativePreference: need.creativePreference,
      },
      hold: null,
    };
  }

  if (
    investigate &&
    !canExplore &&
    (need.missingExactSourceRefs.length > 0 || !need.mandatoryComplete)
  ) {
    reasons.push('investigation_required_but_reads_unauthorized');
    return {
      creativeInput: undefined,
      decision: {
        version: 'storyteller-recipe-decision.v1',
        selectedRecipeFamily: 'hold',
        reasons,
        evidenceNeedVersion: 'task-evidence-need.v1',
        mandatoryComplete: need.mandatoryComplete,
        missingExactSourceRefs: need.missingExactSourceRefs,
        creativePreference: need.creativePreference,
      },
      hold: {
        code: 'storyteller_evidence_unavailable',
        reason:
          'Mandatory or explicit missing sources require reads that the effective policy does not authorize',
      },
    };
  }

  if (investigate && !canExplore) {
    reasons.push('creative_preference_ignored_without_read_authority');
  } else if (!investigate) {
    reasons.push('no_structured_investigation_need');
  }

  if (input.policy.limits.maxModelRoundsPerOperation >= 2) {
    reasons.push('select_repairable_turn');
    return {
      creativeInput: { posture: 'off', maxRepairRounds: 1 },
      decision: {
        version: 'storyteller-recipe-decision.v1',
        selectedRecipeFamily: 'repairable-turn',
        reasons,
        evidenceNeedVersion: 'task-evidence-need.v1',
        mandatoryComplete: need.mandatoryComplete,
        missingExactSourceRefs: need.missingExactSourceRefs,
        creativePreference: need.creativePreference,
      },
      hold: null,
    };
  }

  reasons.push('select_single_turn');
  return {
    creativeInput: undefined,
    decision: {
      version: 'storyteller-recipe-decision.v1',
      selectedRecipeFamily: 'single-turn',
      reasons,
      evidenceNeedVersion: 'task-evidence-need.v1',
      mandatoryComplete: need.mandatoryComplete,
      missingExactSourceRefs: need.missingExactSourceRefs,
      creativePreference: need.creativePreference,
    },
    hold: null,
  };
}

/** Assess need then select recipe in one pure step. */
export function decideAdmittedRecipe(input: {
  evidenceNeed: TaskEvidenceNeedInput;
  policy: EffectiveUsagePolicy;
  taskKind: Parameters<typeof selectAdmittedRecipeIntent>[0]['taskKind'];
}): AdmittedRecipeSelection {
  return selectAdmittedRecipeIntent({
    need: assessTaskEvidenceNeed(input.evidenceNeed),
    policy: input.policy,
    taskKind: input.taskKind,
  });
}
