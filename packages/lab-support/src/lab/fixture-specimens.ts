/**
 * CH03: pure semantic fixture specimens. Validates with real game/contract
 * schemas. Does not write a database — CH04 owns persistence.
 */
import { createHash, randomUUID } from 'node:crypto';
import {
  parseChamberLabFixtureRecipe,
  type ChamberLabFixtureOverlay,
  type ChamberLabFixtureRecipe,
} from '@offscreen/contracts/chamber-lab';
import { interactionSchema } from '@offscreen/contracts/interactions';
import {
  storyItemSchema,
  storyItemsSchema,
} from '@offscreen/contracts/stories';
import {
  actionDefinitionSchema,
  activityProgressSchema,
  resolvedActivityPlanSchema,
  type ActionDefinition,
  type ActivityProgress,
  type ResolvedActivityPlan,
} from '@offscreen/game/activities';

export class FixtureSpecimenError extends Error {
  constructor(
    readonly code:
      | 'missing-accepted-plan'
      | 'foreign-item-holder'
      | 'duplicate-item'
      | 'malformed-deadline'
      | 'unsupported-overlay'
      | 'incompatible-overlays'
      | 'invalid-recipe',
    message: string,
    readonly component?: string,
  ) {
    super(message);
    this.name = 'FixtureSpecimenError';
  }
}

export type FixtureSpecimenState = {
  gameSecond: number;
  acceptedPlan: ResolvedActivityPlan | null;
  activityProgress: ActivityProgress | null;
  items: Array<{ key: string; label: string; holderKey: string }>;
  decision: {
    offerId: string;
    interactionId: string;
    dueGameSecond: number;
    interaction: ReturnType<typeof interactionSchema.parse>;
  } | null;
};

export type FixtureSpecimen = {
  recipe: ChamberLabFixtureRecipe;
  state: FixtureSpecimenState;
  summary: {
    progressRatio: number | null;
    itemCount: number;
    decisionDue: boolean;
  };
  /** sha256 of canonical semantic state + recipe identity; changes with setup. */
  hash: string;
};

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`;
}

export function hashFixtureSpecimen(input: {
  recipe: Pick<ChamberLabFixtureRecipe, 'id' | 'version' | 'seed' | 'overlays'>;
  state: FixtureSpecimenState;
}): string {
  return createHash('sha256')
    .update(
      canonicalJson({
        id: input.recipe.id,
        version: input.recipe.version,
        seed: input.recipe.seed,
        overlays: input.recipe.overlays,
        state: input.state,
      }),
    )
    .digest('hex');
}

function clockWaitAction(args: {
  actionId: string;
  requiredFictionalSeconds: number;
}): ActionDefinition {
  return actionDefinitionSchema.parse({
    id: args.actionId,
    label: 'Paid shift',
    description: 'Finite clock-wait work for Chamber specimens.',
    requires: [],
    capacity: 'work',
    process: {
      kind: 'clock-wait.v1',
      progressLabel: 'Shift progress',
      requiredFictionalSeconds: args.requiredFictionalSeconds,
    },
    conditionPolicy: { kind: 'admission-only' },
    occurrence: { kind: 'unbounded' },
    completionFollowUp: 'quiet',
    checks: [],
    completion: { text: 'The shift ends.', effects: [] },
  });
}

function applyAcceptedFiniteWork(
  state: FixtureSpecimenState,
  overlay: Extract<ChamberLabFixtureOverlay, { kind: 'accepted-finite-work' }>,
): void {
  if (state.acceptedPlan) {
    throw new FixtureSpecimenError(
      'incompatible-overlays',
      'Only one accepted-finite-work overlay is allowed',
      'accepted-finite-work',
    );
  }
  const action = clockWaitAction({
    actionId: overlay.actionId,
    requiredFictionalSeconds: overlay.requiredFictionalSeconds,
  });
  const elapsed = Math.floor(
    overlay.requiredFictionalSeconds * overlay.progressRatio,
  );
  if (elapsed <= 0 || elapsed >= overlay.requiredFictionalSeconds) {
    throw new FixtureSpecimenError(
      'invalid-recipe',
      'progressRatio must leave the shift accepted and not yet settled',
      'accepted-finite-work',
    );
  }
  state.acceptedPlan = resolvedActivityPlanSchema.parse({
    version: 6,
    action,
    settingsRevision: overlay.settingsRevision,
    resolvedThroughGameSecond: overlay.acceptedAtGameSecond,
  });
  state.activityProgress = activityProgressSchema.parse({
    effortGameSeconds: elapsed,
    process: {
      kind: 'clock-wait.v1',
      elapsedFictionalSeconds: elapsed,
    },
    completionPending: false,
  });
  state.gameSecond = Math.max(state.gameSecond, overlay.acceptedAtGameSecond);
}

function applyOwnedItem(
  state: FixtureSpecimenState,
  overlay: Extract<ChamberLabFixtureOverlay, { kind: 'owned-item' }>,
): void {
  if (overlay.holderKey !== overlay.ownerHolderKey) {
    throw new FixtureSpecimenError(
      'foreign-item-holder',
      `Item ${overlay.itemKey} holder ${overlay.holderKey} is not owner ${overlay.ownerHolderKey}`,
      'owned-item',
    );
  }
  if (state.items.some((item) => item.key === overlay.itemKey)) {
    throw new FixtureSpecimenError(
      'duplicate-item',
      `Duplicate item identity ${overlay.itemKey}`,
      'owned-item',
    );
  }
  const item = storyItemSchema.parse({
    key: overlay.itemKey,
    label: overlay.label,
    holderKey: overlay.holderKey,
  });
  state.items = storyItemsSchema.parse([...state.items, item]);
}

function applyDueDecision(
  state: FixtureSpecimenState,
  overlay: Extract<ChamberLabFixtureOverlay, { kind: 'due-decision-boundary' }>,
): void {
  if (state.decision) {
    throw new FixtureSpecimenError(
      'incompatible-overlays',
      'Only one due-decision-boundary overlay is allowed',
      'due-decision-boundary',
    );
  }
  if (overlay.dueGameSecond > overlay.gameSecond) {
    throw new FixtureSpecimenError(
      'malformed-deadline',
      'Decision boundary is not yet due at gameSecond',
      'due-decision-boundary',
    );
  }
  const interaction = interactionSchema.parse({
    id: overlay.interactionId,
    specification: {
      kind: 'choice.v1',
      prompt: overlay.prompt,
      options: overlay.options,
    },
  });
  state.decision = {
    offerId: overlay.offerId,
    interactionId: overlay.interactionId,
    dueGameSecond: overlay.dueGameSecond,
    interaction,
  };
  state.gameSecond = Math.max(state.gameSecond, overlay.gameSecond);
}

/**
 * Compose an in-memory specimen. Rejects impossible overlays before any
 * persistence (CH04). Progress without an accepted plan never materializes.
 */
export function composeFixtureSpecimen(input: unknown): FixtureSpecimen {
  let recipe: ChamberLabFixtureRecipe;
  try {
    recipe = parseChamberLabFixtureRecipe(input);
  } catch (error) {
    throw new FixtureSpecimenError(
      'invalid-recipe',
      error instanceof Error ? error.message : String(error),
      'recipe',
    );
  }

  const state: FixtureSpecimenState = {
    gameSecond: 0,
    acceptedPlan: null,
    activityProgress: null,
    items: [],
    decision: null,
  };

  for (const overlay of recipe.overlays) {
    switch (overlay.kind) {
      case 'accepted-finite-work':
        applyAcceptedFiniteWork(state, overlay);
        break;
      case 'owned-item':
        applyOwnedItem(state, overlay);
        break;
      case 'due-decision-boundary':
        applyDueDecision(state, overlay);
        break;
      default: {
        const _never: never = overlay;
        throw new FixtureSpecimenError(
          'unsupported-overlay',
          `Unsupported overlay ${JSON.stringify(_never)}`,
        );
      }
    }
  }

  const hasProgressWithoutPlan =
    state.activityProgress !== null && state.acceptedPlan === null;
  if (hasProgressWithoutPlan) {
    throw new FixtureSpecimenError(
      'missing-accepted-plan',
      'Activity progress requires an accepted finite-work plan',
      'activityProgress',
    );
  }

  const progressRatio =
    state.acceptedPlan &&
    state.activityProgress &&
    state.acceptedPlan.action.process.kind === 'clock-wait.v1' &&
    state.activityProgress.process.kind === 'clock-wait.v1'
      ? state.activityProgress.process.elapsedFictionalSeconds /
        state.acceptedPlan.action.process.requiredFictionalSeconds
      : null;

  const hash = hashFixtureSpecimen({ recipe, state });
  return {
    recipe,
    state,
    summary: {
      progressRatio,
      itemCount: state.items.length,
      decisionDue: state.decision !== null,
    },
    hash,
  };
}

/** Convenience: accepted shift at 80% plus optional sealed letter + due choice. */
export function acceptedShiftEightyPercentRecipe(args?: {
  seed?: number;
  includeItem?: boolean;
  includeDueDecision?: boolean;
}): ChamberLabFixtureRecipe {
  const seed = args?.seed ?? 141;
  const overlays: ChamberLabFixtureOverlay[] = [
    {
      kind: 'accepted-finite-work',
      actionId: 'paid-shift',
      requiredFictionalSeconds: 1000,
      progressRatio: 0.8,
      acceptedAtGameSecond: 100,
      settingsRevision: 1,
    },
  ];
  if (args?.includeItem !== false) {
    overlays.push({
      kind: 'owned-item',
      itemKey: 'sealed-letter',
      label: 'Sealed letter',
      ownerHolderKey: 'courier',
      holderKey: 'courier',
    });
  }
  if (args?.includeDueDecision) {
    overlays.push({
      kind: 'due-decision-boundary',
      offerId: randomUUID(),
      interactionId: randomUUID(),
      gameSecond: 100,
      dueGameSecond: 100,
      prompt: 'The gate deadline is due. What do you do?',
      options: [
        { id: 'deliver', label: 'Give the letter to the caretaker' },
        { id: 'keep', label: 'Keep the letter and leave' },
      ],
    });
  }
  return parseChamberLabFixtureRecipe({
    id: 'accepted-shift-80pct',
    version: 1,
    seed,
    overlays,
  });
}
