/**
 * CH04: materialize CH03 specimens into an isolated Sandbox run store.
 * PostgreSQL DROP/CREATE is gated; default proof uses an in-memory store.
 */
import { randomUUID } from 'node:crypto';
import {
  acceptedShiftEightyPercentRecipe,
  composeFixtureSpecimen,
  FixtureSpecimenError,
  type FixtureSpecimen,
  type FixtureSpecimenState,
} from './fixture-specimens.js';
import {
  assertDestructiveSandboxProvisionAllowed,
  assertSandboxDatabaseTarget,
  buildSandboxDatabaseUrl,
  sandboxDatabaseNameForRun,
  type SandboxDatabaseTarget,
} from './sandbox-guard.js';

export type SandboxCheckpointRef = {
  runId: string;
  databaseName: string;
  fixtureId: string;
  fixtureVersion: number;
  fixtureHash: string;
  storyId: string;
};

export type SandboxPublicSummary = {
  storyId: string;
  gameSecond: number;
  progressRatio: number | null;
  itemKeys: string[];
  itemHolders: Record<string, string>;
  decisionDueGameSecond: number | null;
  fixtureHash: string;
};

export type SandboxStore = {
  readonly kind: 'memory' | 'postgres';
  writeSpecimen(args: {
    runId: string;
    storyId: string;
    specimen: FixtureSpecimen;
  }): Promise<void>;
  readSummary(args: {
    runId: string;
    storyId: string;
  }): Promise<SandboxPublicSummary | null>;
  /** Optional mutator used only to prove cross-run isolation in tests. */
  mutateItemHolder?(args: {
    runId: string;
    storyId: string;
    itemKey: string;
    holderKey: string;
  }): Promise<void>;
  close(): Promise<void>;
};

type MemoryRow = {
  specimen: FixtureSpecimen;
  storyId: string;
  state: FixtureSpecimenState;
};

export function createMemorySandboxStore(): SandboxStore {
  const runs = new Map<string, Map<string, MemoryRow>>();

  return {
    kind: 'memory',
    async writeSpecimen(args) {
      const byStory = runs.get(args.runId) ?? new Map<string, MemoryRow>();
      byStory.set(args.storyId, {
        specimen: args.specimen,
        storyId: args.storyId,
        state: structuredClone(args.specimen.state),
      });
      runs.set(args.runId, byStory);
    },
    async readSummary(args) {
      const row = runs.get(args.runId)?.get(args.storyId);
      if (!row) return null;
      return summarize(row.storyId, row.state, row.specimen.hash);
    },
    async mutateItemHolder(args) {
      const row = runs.get(args.runId)?.get(args.storyId);
      if (!row) {
        throw new Error('Unknown sandbox story');
      }
      const item = row.state.items.find((entry) => entry.key === args.itemKey);
      if (!item) {
        throw new Error('Unknown sandbox item');
      }
      item.holderKey = args.holderKey;
    },
    async close() {
      runs.clear();
    },
  };
}

function summarize(
  storyId: string,
  state: FixtureSpecimenState,
  fixtureHash: string,
): SandboxPublicSummary {
  const progressRatio =
    state.acceptedPlan &&
    state.activityProgress &&
    state.acceptedPlan.action.process.kind === 'clock-wait.v1' &&
    state.activityProgress.process.kind === 'clock-wait.v1'
      ? state.activityProgress.process.elapsedFictionalSeconds /
        state.acceptedPlan.action.process.requiredFictionalSeconds
      : null;
  return {
    storyId,
    gameSecond: state.gameSecond,
    progressRatio,
    itemKeys: state.items.map((item) => item.key),
    itemHolders: Object.fromEntries(
      state.items.map((item) => [item.key, item.holderKey]),
    ),
    decisionDueGameSecond: state.decision?.dueGameSecond ?? null,
    fixtureHash,
  };
}

export type SandboxMaterialization = {
  checkpoint: SandboxCheckpointRef;
  summary: SandboxPublicSummary;
  target: SandboxDatabaseTarget | null;
  storeKind: SandboxStore['kind'];
};

/**
 * Prepare a Sandbox target descriptor without connecting.
 * Rejects reserved/remote URLs when a connection string is supplied.
 */
export function prepareSandboxMaterialization(args: {
  recipe?: unknown;
  runId?: string;
  connectionString?: string;
}): {
  runId: string;
  specimen: FixtureSpecimen;
  databaseName: string;
  target: SandboxDatabaseTarget | null;
} {
  const runId = args.runId ?? randomUUID();
  const recipe = args.recipe ?? acceptedShiftEightyPercentRecipe({ seed: 141 });
  let specimen: FixtureSpecimen;
  try {
    specimen = composeFixtureSpecimen(recipe);
  } catch (error) {
    if (error instanceof FixtureSpecimenError) {
      throw error;
    }
    throw new FixtureSpecimenError(
      'invalid-recipe',
      error instanceof Error ? error.message : String(error),
      'recipe',
    );
  }
  const databaseName = sandboxDatabaseNameForRun(runId);
  const target = args.connectionString
    ? assertSandboxDatabaseTarget(args.connectionString, runId)
    : assertSandboxDatabaseTarget(buildSandboxDatabaseUrl({ runId }), runId);
  if (target.databaseName !== databaseName) {
    throw new Error('Sandbox target database name mismatch');
  }
  return { runId, specimen, databaseName, target };
}

/**
 * Materialize a validated specimen into an isolated store.
 * Does not open PostgreSQL unless a postgres store is supplied by the caller
 * after `assertDestructiveSandboxProvisionAllowed`.
 */
export async function materializeSandboxSpecimen(args: {
  recipe?: unknown;
  runId?: string;
  store: SandboxStore;
  connectionString?: string;
  /** Required only when intending live DROP/CREATE against postgres. */
  confirmDisposableProvision?: boolean;
}): Promise<SandboxMaterialization> {
  const prepared = prepareSandboxMaterialization({
    ...(args.recipe !== undefined ? { recipe: args.recipe } : {}),
    ...(args.runId !== undefined ? { runId: args.runId } : {}),
    ...(args.connectionString !== undefined
      ? { connectionString: args.connectionString }
      : {}),
  });

  let target: SandboxDatabaseTarget | null = prepared.target;
  if (args.store.kind === 'postgres') {
    target = assertDestructiveSandboxProvisionAllowed({
      connectionString:
        args.connectionString ??
        buildSandboxDatabaseUrl({ runId: prepared.runId }),
      runId: prepared.runId,
      confirmDisposableProvision: args.confirmDisposableProvision === true,
    });
  }

  const storyId = randomUUID();
  try {
    await args.store.writeSpecimen({
      runId: prepared.runId,
      storyId,
      specimen: prepared.specimen,
    });
  } catch (error) {
    await args.store.close().catch(() => undefined);
    throw error;
  }

  const summary = await args.store.readSummary({
    runId: prepared.runId,
    storyId,
  });
  if (!summary) {
    await args.store.close().catch(() => undefined);
    throw new Error('Sandbox materialization failed to read back summary');
  }

  return {
    checkpoint: {
      runId: prepared.runId,
      databaseName: prepared.databaseName,
      fixtureId: prepared.specimen.recipe.id,
      fixtureVersion: prepared.specimen.recipe.version,
      fixtureHash: prepared.specimen.hash,
      storyId,
    },
    summary,
    target,
    storeKind: args.store.kind,
  };
}

/** Rematerialize the same recipe under a new run identity (no Temporal rewind). */
export async function rematerializeSandboxSpecimen(args: {
  recipe: unknown;
  storeFactory: () => SandboxStore;
}): Promise<{
  first: SandboxMaterialization;
  second: SandboxMaterialization;
}> {
  const storeA = args.storeFactory();
  const storeB = args.storeFactory();
  try {
    const first = await materializeSandboxSpecimen({
      recipe: args.recipe,
      store: storeA,
    });
    const second = await materializeSandboxSpecimen({
      recipe: args.recipe,
      store: storeB,
    });
    return { first, second };
  } finally {
    await Promise.all([storeA.close(), storeB.close()]);
  }
}
