/**
 * CH06: typed LabRun state machine and whitelisted semantic steps.
 * Dispatches real lab modules; no eval/SQL/UI/DB pool.
 */
import { createHash, randomUUID } from 'node:crypto';
import {
  parseLabStepRequest,
  type ChamberLabLane,
  type LabRunLifecycle,
  type LabStepCommand,
  type LabStepRequest,
} from '@offscreen/contracts/chamber-lab';
import {
  acceptedShiftEightyPercentRecipe,
  composeFixtureSpecimen,
  type FixtureSpecimen,
  type FixtureSpecimenState,
} from './fixture-specimens.js';
import { advanceClockWaitToBoundary, createLabEntropy } from './lab-clock.js';
import {
  createMemorySandboxStore,
  materializeSandboxSpecimen,
  type SandboxStore,
} from './sandbox-materializer.js';

export type LabStepOutcome =
  'ok' | 'unchanged' | 'blocked' | 'failed' | 'cancelled';

export type LabStepResult = {
  runId: string;
  stepId: string;
  ordinal: number;
  runRevision: number;
  outcome: LabStepOutcome;
  commandKind: LabStepCommand['kind'];
  observation: unknown;
  errorCode?: string;
  detail?: string;
};

export type LabRunSnapshot = {
  runId: string;
  lane: ChamberLabLane;
  lifecycle: LabRunLifecycle;
  revision: number;
  seed: number;
  fixtureHash: string | null;
  nextOrdinal: number;
  breakpoint: string | null;
  evidenceTier: ChamberLabLane;
};

type InternalRun = {
  snapshot: LabRunSnapshot;
  recipe: unknown;
  specimen: FixtureSpecimen | null;
  state: FixtureSpecimenState | null;
  sandboxStore: SandboxStore | null;
  sandboxStoryId: string | null;
  submittedSteps: Map<string, { bodyHash: string; result: LabStepResult }>;
  ordinalResults: Map<number, LabStepResult>;
  assertionResults: Map<string, boolean>;
  entropyDraws: number[];
};

const SUPPORTS: Record<ChamberLabLane, ReadonlySet<LabStepCommand['kind']>> = {
  'bench-policy': new Set([
    'load',
    'inspect',
    'advanceClock',
    'assert',
    'saveCheckpoint',
    'export',
    'reset',
  ]),
  'sandbox-db': new Set([
    'load',
    'inspect',
    'advanceClock',
    'assert',
    'saveCheckpoint',
    'export',
    'reset',
  ]),
  connected: new Set(['load', 'inspect', 'export']),
  'held-packet': new Set(['load', 'inspect', 'export']),
  'authorized-live': new Set(['load', 'inspect', 'export']),
};

function bodyHash(command: LabStepCommand): string {
  return createHash('sha256').update(JSON.stringify(command)).digest('hex');
}

function terminal(lifecycle: LabRunLifecycle): boolean {
  return (
    lifecycle === 'completed' ||
    lifecycle === 'failed' ||
    lifecycle === 'blocked' ||
    lifecycle === 'cancelled'
  );
}

export class LabRunError extends Error {
  constructor(
    readonly code:
      | 'stale-revision'
      | 'out-of-order'
      | 'duplicate-body-mismatch'
      | 'invalid-lifecycle'
      | 'unknown-run',
    message: string,
  ) {
    super(message);
    this.name = 'LabRunError';
  }
}

export function createLabRun(args: {
  lane: ChamberLabLane;
  seed?: number;
  recipe?: unknown;
  breakpoint?: string | null;
}): LabRunHandle {
  const seed = args.seed ?? 141;
  const run: InternalRun = {
    snapshot: {
      runId: randomUUID(),
      lane: args.lane,
      lifecycle: 'prepared',
      revision: 0,
      seed,
      fixtureHash: null,
      nextOrdinal: 1,
      breakpoint: args.breakpoint ?? null,
      evidenceTier: args.lane,
    },
    recipe: args.recipe ?? acceptedShiftEightyPercentRecipe({ seed }),
    specimen: null,
    state: null,
    sandboxStore: null,
    sandboxStoryId: null,
    submittedSteps: new Map(),
    ordinalResults: new Map(),
    assertionResults: new Map(),
    entropyDraws: [],
  };
  return new LabRunHandle(run);
}

export class LabRunHandle {
  constructor(private readonly run: InternalRun) {}

  snapshot(): LabRunSnapshot {
    return { ...this.run.snapshot };
  }

  pause(): LabRunSnapshot {
    if (this.run.snapshot.lifecycle !== 'running') {
      throw new LabRunError(
        'invalid-lifecycle',
        `Cannot pause from ${this.run.snapshot.lifecycle}`,
      );
    }
    this.run.snapshot.lifecycle = 'paused';
    this.run.snapshot.revision += 1;
    return this.snapshot();
  }

  resume(): LabRunSnapshot {
    if (this.run.snapshot.lifecycle !== 'paused') {
      throw new LabRunError(
        'invalid-lifecycle',
        `Cannot resume from ${this.run.snapshot.lifecycle}`,
      );
    }
    this.run.snapshot.lifecycle = 'running';
    this.run.snapshot.revision += 1;
    return this.snapshot();
  }

  cancel(): LabRunSnapshot {
    if (terminal(this.run.snapshot.lifecycle)) {
      throw new LabRunError(
        'invalid-lifecycle',
        `Cannot cancel terminal run ${this.run.snapshot.lifecycle}`,
      );
    }
    this.run.snapshot.lifecycle = 'cancelled';
    this.run.snapshot.revision += 1;
    return this.snapshot();
  }

  async step(input: unknown): Promise<LabStepResult> {
    const request = parseLabStepRequest(input);
    return this.execute(request);
  }

  async runAll(commands: LabStepCommand[]): Promise<LabStepResult[]> {
    const results: LabStepResult[] = [];
    for (const command of commands) {
      if (
        this.run.snapshot.lifecycle === 'paused' ||
        terminal(this.run.snapshot.lifecycle)
      ) {
        break;
      }
      const result = await this.step({
        stepId: randomUUID(),
        ordinal: this.run.snapshot.nextOrdinal,
        expectedRunRevision: this.run.snapshot.revision,
        command,
      });
      results.push(result);
      if (result.outcome === 'blocked' || result.outcome === 'failed') {
        break;
      }
      if (this.snapshot().lifecycle === 'paused') {
        break;
      }
    }
    return results;
  }

  /** Fresh isolated rematerialization — never rewinds Temporal/DB history. */
  async replay(): Promise<LabRunHandle> {
    return createLabRun({
      lane: this.run.snapshot.lane,
      seed: this.run.snapshot.seed,
      recipe: this.run.recipe,
      breakpoint: this.run.snapshot.breakpoint,
    });
  }

  private async execute(request: LabStepRequest): Promise<LabStepResult> {
    const existing = this.run.submittedSteps.get(request.stepId);
    if (existing) {
      if (existing.bodyHash !== bodyHash(request.command)) {
        throw new LabRunError(
          'duplicate-body-mismatch',
          `Step ${request.stepId} was submitted with a different body`,
        );
      }
      return existing.result;
    }

    if (request.expectedRunRevision !== this.run.snapshot.revision) {
      throw new LabRunError(
        'stale-revision',
        `Expected revision ${request.expectedRunRevision}, run is at ${this.run.snapshot.revision}`,
      );
    }
    if (request.ordinal !== this.run.snapshot.nextOrdinal) {
      throw new LabRunError(
        'out-of-order',
        `Expected ordinal ${this.run.snapshot.nextOrdinal}, got ${request.ordinal}`,
      );
    }
    if (terminal(this.run.snapshot.lifecycle)) {
      throw new LabRunError(
        'invalid-lifecycle',
        `Cannot step terminal run ${this.run.snapshot.lifecycle}`,
      );
    }
    if (this.run.snapshot.lifecycle === 'paused') {
      throw new LabRunError(
        'invalid-lifecycle',
        'Cannot step while paused; resume first',
      );
    }
    if (this.run.snapshot.lifecycle === 'prepared') {
      this.run.snapshot.lifecycle = 'running';
    }

    const supported = SUPPORTS[this.run.snapshot.lane];
    if (!supported.has(request.command.kind)) {
      const result = this.record(
        request,
        {
          outcome: 'blocked',
          observation: null,
          errorCode: 'unsupported-command',
          detail: `Lane ${this.run.snapshot.lane} does not support ${request.command.kind}`,
        },
        true,
      );
      this.run.snapshot.lifecycle = 'blocked';
      return result;
    }

    try {
      const handled = await this.dispatch(request.command);
      const result = this.record(request, handled, true);
      if (
        request.breakpoint &&
        this.run.snapshot.breakpoint &&
        request.breakpoint === this.run.snapshot.breakpoint
      ) {
        this.run.snapshot.lifecycle = 'paused';
      }
      if (request.command.kind === 'assert' && handled.outcome === 'failed') {
        this.run.snapshot.lifecycle = 'failed';
      }
      return result;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const result = this.record(
        request,
        {
          outcome: 'failed',
          observation: null,
          errorCode: 'step-threw',
          detail,
        },
        true,
      );
      this.run.snapshot.lifecycle = 'failed';
      return result;
    }
  }

  private record(
    request: LabStepRequest,
    handled: {
      outcome: LabStepOutcome;
      observation: unknown;
      errorCode?: string;
      detail?: string;
    },
    advanceOrdinal: boolean,
  ): LabStepResult {
    this.run.snapshot.revision += 1;
    if (advanceOrdinal) {
      this.run.snapshot.nextOrdinal += 1;
    }
    const result: LabStepResult = {
      runId: this.run.snapshot.runId,
      stepId: request.stepId,
      ordinal: request.ordinal,
      runRevision: this.run.snapshot.revision,
      outcome: handled.outcome,
      commandKind: request.command.kind,
      observation: handled.observation,
      ...(handled.errorCode !== undefined
        ? { errorCode: handled.errorCode }
        : {}),
      ...(handled.detail !== undefined ? { detail: handled.detail } : {}),
    };
    this.run.submittedSteps.set(request.stepId, {
      bodyHash: bodyHash(request.command),
      result,
    });
    this.run.ordinalResults.set(request.ordinal, result);
    return result;
  }

  private async dispatch(command: LabStepCommand): Promise<{
    outcome: LabStepOutcome;
    observation: unknown;
    errorCode?: string;
    detail?: string;
  }> {
    switch (command.kind) {
      case 'load':
        return this.load();
      case 'inspect':
        return this.inspect(command.facets);
      case 'advanceClock':
        return this.advanceClock(command.targetGameSecond);
      case 'assert':
        return this.assertInvariant(command.invariantId, command.expected);
      case 'saveCheckpoint':
        return {
          outcome: 'ok',
          observation: {
            fixtureHash: this.run.snapshot.fixtureHash,
            revision: this.run.snapshot.revision,
          },
        };
      case 'export':
        return {
          outcome: 'ok',
          observation: {
            runId: this.run.snapshot.runId,
            seed: this.run.snapshot.seed,
            fixtureHash: this.run.snapshot.fixtureHash,
            steps: [...this.run.ordinalResults.values()],
          },
        };
      case 'reset':
        return this.reset();
      case 'admitChoice':
      case 'admitActivity':
      case 'controlActivity':
      case 'deliverNotice':
      case 'armFault':
      case 'releaseFault':
        return {
          outcome: 'blocked',
          observation: null,
          errorCode: 'not-implemented-seam',
          detail: `${command.kind} awaits a later owning adapter; zero side effects`,
        };
      default: {
        const _never: never = command;
        return {
          outcome: 'blocked',
          observation: null,
          errorCode: 'unknown-command',
          detail: JSON.stringify(_never),
        };
      }
    }
  }

  private async load(): Promise<{
    outcome: LabStepOutcome;
    observation: unknown;
  }> {
    if (this.run.snapshot.lane === 'sandbox-db') {
      await this.run.sandboxStore?.close().catch(() => undefined);
      this.run.sandboxStore = createMemorySandboxStore();
      const materialization = await materializeSandboxSpecimen({
        recipe: this.run.recipe,
        runId: this.run.snapshot.runId,
        store: this.run.sandboxStore,
      });
      const specimen = composeFixtureSpecimen(this.run.recipe);
      this.run.specimen = specimen;
      this.run.state = structuredClone(specimen.state);
      this.run.sandboxStoryId = materialization.checkpoint.storyId;
      this.run.snapshot.fixtureHash = materialization.checkpoint.fixtureHash;
      return {
        outcome: 'ok',
        observation: {
          storyId: materialization.checkpoint.storyId,
          databaseName: materialization.checkpoint.databaseName,
          summary: materialization.summary,
        },
      };
    }
    const specimen = composeFixtureSpecimen(this.run.recipe);
    this.run.specimen = specimen;
    this.run.state = structuredClone(specimen.state);
    this.run.snapshot.fixtureHash = specimen.hash;
    const entropy = createLabEntropy(this.run.snapshot.seed, 'lab-run-load');
    this.run.entropyDraws = [];
    // Touch entropy so seed is recorded as an active run control without forcing a check.
    void entropy;
    return {
      outcome: 'ok',
      observation: {
        fixtureHash: specimen.hash,
        summary: specimen.summary,
        seed: this.run.snapshot.seed,
      },
    };
  }

  private inspect(facets: readonly string[]): {
    outcome: LabStepOutcome;
    observation: unknown;
    errorCode?: string;
    detail?: string;
  } {
    if (!this.run.state || !this.run.specimen) {
      return {
        outcome: 'failed',
        observation: null,
        errorCode: 'not-loaded',
        detail: 'inspect requires load first',
      };
    }
    const observation: Record<string, unknown> = {};
    for (const facet of facets) {
      switch (facet) {
        case 'activity':
          observation.activity = {
            plan: this.run.state.acceptedPlan,
            progress: this.run.state.activityProgress,
          };
          break;
        case 'clock':
          observation.clock = { gameSecond: this.run.state.gameSecond };
          break;
        case 'items':
          observation.items = this.run.state.items;
          break;
        case 'decision':
          observation.decision = this.run.state.decision;
          break;
        case 'summary':
          observation.summary = this.run.specimen.summary;
          break;
      }
    }
    return { outcome: 'ok', observation };
  }

  private advanceClock(targetGameSecond: number): {
    outcome: LabStepOutcome;
    observation: unknown;
    errorCode?: string;
    detail?: string;
  } {
    if (!this.run.state) {
      return {
        outcome: 'failed',
        observation: null,
        errorCode: 'not-loaded',
        detail: 'advanceClock requires load first',
      };
    }
    const advanced = advanceClockWaitToBoundary({
      state: this.run.state,
      targetGameSecond,
    });
    this.run.state = advanced.state;
    return {
      outcome: 'ok',
      observation: {
        gameSecond: advanced.state.gameSecond,
        progress: advanced.progress,
        controlledDomain: advanced.controlledDomain,
      },
    };
  }

  private assertInvariant(
    invariantId: string,
    expected: unknown,
  ): {
    outcome: LabStepOutcome;
    observation: unknown;
    errorCode?: string;
    detail?: string;
  } {
    if (!this.run.state || !this.run.specimen) {
      return {
        outcome: 'failed',
        observation: null,
        errorCode: 'not-loaded',
        detail: 'assert requires load first',
      };
    }
    let passed = false;
    let actual: unknown;
    switch (invariantId) {
      case 'progress-ratio': {
        const plan = this.run.state.acceptedPlan;
        const progress = this.run.state.activityProgress;
        actual =
          plan &&
          progress &&
          plan.action.process.kind === 'clock-wait.v1' &&
          progress.process.kind === 'clock-wait.v1'
            ? progress.process.elapsedFictionalSeconds /
              plan.action.process.requiredFictionalSeconds
            : null;
        passed =
          expected === undefined
            ? actual !== null
            : Object.is(actual, expected);
        break;
      }
      case 'item-count': {
        const count = this.run.state.items.length;
        actual = count;
        passed =
          expected === undefined ? count >= 0 : Object.is(count, expected);
        break;
      }
      case 'game-second-at-least':
        actual = this.run.state.gameSecond;
        passed =
          typeof expected === 'number' && this.run.state.gameSecond >= expected;
        break;
      default:
        return {
          outcome: 'blocked',
          observation: null,
          errorCode: 'unknown-invariant',
          detail: `No assert handler for ${invariantId}`,
        };
    }
    this.run.assertionResults.set(invariantId, passed);
    return {
      outcome: passed ? 'ok' : 'failed',
      observation: { invariantId, expected, actual, passed },
      ...(passed
        ? {}
        : { errorCode: 'assert-failed', detail: `${invariantId} failed` }),
    };
  }

  private async reset(): Promise<{
    outcome: LabStepOutcome;
    observation: unknown;
  }> {
    await this.run.sandboxStore?.close().catch(() => undefined);
    this.run.sandboxStore = null;
    this.run.sandboxStoryId = null;
    this.run.specimen = null;
    this.run.state = null;
    this.run.snapshot.fixtureHash = null;
    this.run.assertionResults.clear();
    // Reload fresh specimen under same recipe/seed — new structural load.
    return this.load();
  }
}
