/**
 * CH06: typed LabRun state machine and whitelisted semantic steps.
 * Dispatches real lab modules; no eval/SQL/UI/DB pool.
 */
import { createHash, randomUUID } from 'node:crypto';
import {
  parseLabStepRequest,
  type ChamberLabLane,
  type LabObservation,
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
  assertEvidenceImmutable,
  createMemoryArtifactStore,
  finalizeLabRunEvidence,
  LabEvidenceError,
  type MemoryArtifactStore,
} from './lab-evidence.js';
import {
  createLabFaultRegistry,
  LabFaultError,
  type LabFaultRegistry,
} from './lab-faults.js';
import { observeSpecimenState } from './lab-observation.js';
import type { LabRunEvidenceCapsule } from '@offscreen/contracts/chamber-lab';
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
  faults: LabFaultRegistry;
  startedAt: string;
  evidence: LabRunEvidenceCapsule | null;
  artifactStore: MemoryArtifactStore;
  scenarioId: string | null;
  scenarioVersion: number | null;
  expectedFixtureHash: string | null;
};

const SUPPORTS: Record<ChamberLabLane, ReadonlySet<LabStepCommand['kind']>> = {
  'bench-policy': new Set([
    'load',
    'inspect',
    'advanceClock',
    'armFault',
    'releaseFault',
    'assert',
    'saveCheckpoint',
    'export',
    'reset',
  ]),
  'sandbox-db': new Set([
    'load',
    'inspect',
    'advanceClock',
    'armFault',
    'releaseFault',
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
  scenarioId?: string | null;
  scenarioVersion?: number | null;
  expectedFixtureHash?: string | null;
  gitCommit?: string;
  dirty?: boolean;
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
    faults: createLabFaultRegistry(),
    startedAt: new Date().toISOString(),
    evidence: null,
    artifactStore: createMemoryArtifactStore(),
    scenarioId: args.scenarioId ?? null,
    scenarioVersion: args.scenarioVersion ?? null,
    expectedFixtureHash: args.expectedFixtureHash ?? null,
  };
  return new LabRunHandle(run, {
    gitCommit: args.gitCommit ?? 'unknown-local',
    dirty: args.dirty ?? true,
  });
}

export class LabRunHandle {
  constructor(
    private readonly run: InternalRun,
    private readonly meta: { gitCommit: string; dirty: boolean } = {
      gitCommit: 'unknown-local',
      dirty: true,
    },
  ) {}

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
    this.run.faults.cleanup(this.run.snapshot.runId);
    this.run.snapshot.lifecycle = 'cancelled';
    this.run.snapshot.revision += 1;
    return this.snapshot();
  }

  /** Test-only fault registry — never composed into Nest API. */
  faults(): LabFaultRegistry {
    return this.run.faults;
  }

  exerciseFault(args: {
    faultId: string;
    operationId?: string;
    payload?: unknown;
    generationId?: string;
  }) {
    return this.run.faults.exercise({
      runId: this.run.snapshot.runId,
      faultId: args.faultId,
      ...(args.operationId !== undefined
        ? { operationId: args.operationId }
        : {}),
      ...(args.payload !== undefined ? { payload: args.payload } : {}),
      ...(args.generationId !== undefined
        ? { generationId: args.generationId }
        : {}),
    });
  }

  /** CH07: capture typed observation at the current step boundary. */
  observe(args?: {
    includePrivate?: boolean;
    facetVersions?: Parameters<typeof observeSpecimenState>[0]['facetVersions'];
  }): LabObservation {
    if (!this.run.state) {
      throw new LabRunError(
        'invalid-lifecycle',
        'observe requires a loaded specimen',
      );
    }
    return observeSpecimenState({
      runId: this.run.snapshot.runId,
      stepOrdinal:
        this.run.snapshot.nextOrdinal > 1
          ? this.run.snapshot.nextOrdinal - 1
          : null,
      state: this.run.state,
      revision: this.run.snapshot.revision,
      includePrivate: args?.includePrivate === true,
      ...(args?.facetVersions !== undefined
        ? { facetVersions: args.facetVersions }
        : {}),
    });
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
      scenarioId: this.run.scenarioId,
      scenarioVersion: this.run.scenarioVersion,
      expectedFixtureHash: this.run.expectedFixtureHash,
      gitCommit: this.meta.gitCommit,
      dirty: this.meta.dirty,
    });
  }

  /**
   * CH09: freeze machine evidence. Replay/fork must use a new LabRun id.
   */
  finalizeEvidence(args?: {
    includePrivate?: boolean;
    linkedQaRunId?: string | null;
    privateObservation?: Parameters<
      typeof finalizeLabRunEvidence
    >[0]['privateObservation'];
    providerPacket?: unknown;
    operatorNote?: string | null;
    semanticDiff?: Parameters<typeof finalizeLabRunEvidence>[0]['semanticDiff'];
  }): { capsule: LabRunEvidenceCapsule; markdown: string } {
    if (this.run.evidence) {
      throw new LabEvidenceError(
        'already-finalized',
        'LabRun evidence already finalized; open a new run to replay',
      );
    }
    if (this.run.snapshot.lifecycle === 'prepared') {
      this.run.snapshot.lifecycle = 'completed';
      this.run.snapshot.revision += 1;
    } else if (
      this.run.snapshot.lifecycle === 'running' ||
      this.run.snapshot.lifecycle === 'paused'
    ) {
      this.run.snapshot.lifecycle = 'completed';
      this.run.snapshot.revision += 1;
    }
    this.run.faults.cleanup(this.run.snapshot.runId);
    const assertionResults = [...this.run.assertionResults.entries()].map(
      ([invariantId, passed]) => ({
        invariantId,
        predicate: 'equals' as const,
        passed,
        actual: passed,
        proofBoundary:
          this.run.snapshot.lane === 'sandbox-db'
            ? ('sandbox-db' as const)
            : ('bench-policy' as const),
      }),
    );
    const finished = finalizeLabRunEvidence({
      runId: this.run.snapshot.runId,
      scenarioId: this.run.scenarioId,
      scenarioVersion: this.run.scenarioVersion,
      expectedFixtureHash: this.run.expectedFixtureHash,
      fixtureHash: this.run.snapshot.fixtureHash,
      seed: this.run.snapshot.seed,
      lane: this.run.snapshot.lane,
      status: this.run.snapshot.lifecycle,
      steps: [...this.run.ordinalResults.values()],
      assertionResults,
      faultPlans: this.run.faults.list(this.run.snapshot.runId),
      gitCommit: this.meta.gitCommit,
      dirty: this.meta.dirty,
      startedAt: this.run.startedAt,
      store: this.run.artifactStore,
      ...(args?.includePrivate !== undefined
        ? { includePrivate: args.includePrivate }
        : {}),
      ...(args?.linkedQaRunId !== undefined
        ? { linkedQaRunId: args.linkedQaRunId }
        : {}),
      ...(args?.privateObservation !== undefined
        ? { privateObservation: args.privateObservation }
        : {}),
      ...(args?.providerPacket !== undefined
        ? { providerPacket: args.providerPacket }
        : {}),
      ...(args?.operatorNote !== undefined
        ? { operatorNote: args.operatorNote }
        : {}),
      ...(args?.semanticDiff !== undefined
        ? { semanticDiff: args.semanticDiff }
        : {}),
    });
    this.run.evidence = finished.capsule;
    return { capsule: finished.capsule, markdown: finished.markdown };
  }

  evidence(): LabRunEvidenceCapsule {
    if (!this.run.evidence) {
      throw new LabEvidenceError(
        'not-finalized',
        'finalizeEvidence before reading the capsule',
      );
    }
    return structuredClone(this.run.evidence);
  }

  assertEvidenceFrozen(candidate: unknown): void {
    if (!this.run.evidence) {
      throw new LabEvidenceError(
        'not-finalized',
        'No finalized evidence to compare',
      );
    }
    assertEvidenceImmutable(this.run.evidence, candidate);
  }

  artifactStore(): MemoryArtifactStore {
    return this.run.artifactStore;
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
      case 'armFault':
        return this.armFault(command);
      case 'releaseFault':
        return this.releaseFault(command.faultId);
      case 'admitChoice':
      case 'admitActivity':
      case 'controlActivity':
      case 'deliverNotice':
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

  private armFault(
    command: Extract<LabStepCommand, { kind: 'armFault' }>,
  ): {
    outcome: LabStepOutcome;
    observation: unknown;
    errorCode?: string;
    detail?: string;
  } {
    try {
      const armed = this.run.faults.arm({
        faultId: command.faultId,
        runId: this.run.snapshot.runId,
        cutPoint: command.cutPoint,
        targetOperationId: command.targetOperationId ?? null,
        storyId: command.storyId ?? null,
        ...(command.triggerCount !== undefined
          ? { triggerCount: command.triggerCount }
          : {}),
        expectedObservation: command.expectedObservation,
      });
      return {
        outcome: 'ok',
        observation: {
          faultId: armed.faultId,
          cutPoint: armed.cutPoint,
          remainingTriggers: armed.remainingTriggers,
          armed: true,
        },
      };
    } catch (error) {
      if (error instanceof LabFaultError) {
        return {
          outcome: 'failed',
          observation: null,
          errorCode: error.code,
          detail: error.message,
        };
      }
      throw error;
    }
  }

  private releaseFault(faultId: string): {
    outcome: LabStepOutcome;
    observation: unknown;
    errorCode?: string;
    detail?: string;
  } {
    try {
      const released = this.run.faults.disarm({
        runId: this.run.snapshot.runId,
        faultId,
      });
      return { outcome: 'ok', observation: released };
    } catch (error) {
      if (error instanceof LabFaultError) {
        return {
          outcome: 'failed',
          observation: null,
          errorCode: error.code,
          detail: error.message,
        };
      }
      throw error;
    }
  }

  private async reset(): Promise<{
    outcome: LabStepOutcome;
    observation: unknown;
  }> {
    this.run.faults.cleanup(this.run.snapshot.runId);
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
