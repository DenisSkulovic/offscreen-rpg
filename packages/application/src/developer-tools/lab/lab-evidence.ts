/**
 * CH09: immutable LabRun evidence capsules and default redaction.
 * Machine authority is distinct from human QA journals.
 */
import { createHash, randomUUID } from 'node:crypto';
import {
  parseLabRunEvidenceCapsule,
  type LabEvidenceArtifactRef,
  type LabObservation,
  type LabRunEvidenceCapsule,
  type LabSemanticDelta,
  type LabAssertionResult,
  type ChamberLabLane,
  type LabRunLifecycle,
} from '@offscreen/contracts/chamber-lab';

export class LabEvidenceError extends Error {
  constructor(
    readonly code:
      | 'already-finalized'
      | 'not-finalized'
      | 'immutable'
      | 'fixture-version-mismatch'
      | 'private-gated'
      | 'authority-confusion',
    message: string,
  ) {
    super(message);
    this.name = 'LabEvidenceError';
  }
}

const SECRET_KEY =
  /^(authorization|password|secret|api[_-]?key|token|credential|cookie)$/i;
const PRIVATE_KEY =
  /^(prompt|rawPrompt|providerPacket|canon|narrative|operatorNote|private)$/i;

export function redactLabEvidenceValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((entry) => redactLabEvidenceValue(entry));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (SECRET_KEY.test(key) || PRIVATE_KEY.test(key)) {
        out[key] = '<redacted>';
      } else {
        out[key] = redactLabEvidenceValue(entry);
      }
    }
    return out;
  }
  if (typeof value === 'string') {
    if (/sk-[a-zA-Z0-9]{16,}/.test(value)) return '<redacted-secret>';
    if (/Bearer\s+\S+/i.test(value)) return '<redacted-secret>';
  }
  return value;
}

export type MemoryArtifactStore = {
  put(args: {
    kind: LabEvidenceArtifactRef['kind'];
    body: unknown;
    redactedFromDefault: boolean;
  }): LabEvidenceArtifactRef;
  get(digest: string): { kind: string; body: unknown } | null;
  clear(): void;
};

export function createMemoryArtifactStore(): MemoryArtifactStore {
  const blobs = new Map<string, { kind: string; body: unknown }>();
  return {
    put(args) {
      const serialized = JSON.stringify(args.body);
      const digest = createHash('sha256').update(serialized).digest('hex');
      blobs.set(digest, { kind: args.kind, body: args.body });
      return {
        digest,
        kind: args.kind,
        bytes: Buffer.byteLength(serialized, 'utf8'),
        redactedFromDefault: args.redactedFromDefault,
      };
    },
    get(digest) {
      return blobs.get(digest) ?? null;
    },
    clear() {
      blobs.clear();
    },
  };
}

function hashJson(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function buildReplayCommand(args: {
  scenarioId: string | null;
  seed: number;
  lane: ChamberLabLane;
}): string {
  const scenario = args.scenarioId ?? '<scenario-id>';
  return `pnpm chamber:scenario -- ${scenario} --lane=${args.lane} --seed=${args.seed}`;
}

export function evidenceMarkdownSummary(
  capsule: LabRunEvidenceCapsule,
): string {
  const lines = [
    `# LabRun evidence ${capsule.evidenceId}`,
    '',
    `- authority: ${capsule.authority} (not QA human journal)`,
    `- runId: ${capsule.runId}`,
    `- status: ${capsule.status}`,
    `- lane: ${capsule.lane}`,
    `- seed: ${capsule.seed}`,
    `- fixtureHash: ${capsule.fixtureHash ?? 'none'}`,
    `- git: ${capsule.gitCommit}${capsule.dirty ? ' (dirty)' : ''}`,
    `- providerMode: ${capsule.providerMode}`,
    `- steps: ${capsule.steps.length}`,
    `- assertions: ${capsule.assertionResults.length}`,
    `- redaction: ${capsule.redactionLevel}`,
    `- manualPassedIsNotMachineProof: true`,
    '',
    '## Replay',
    '',
    '```',
    capsule.replayCommand,
    '```',
  ];
  return lines.join('\n');
}

export type FinalizeLabEvidenceInput = {
  runId: string;
  scenarioId?: string | null;
  scenarioVersion?: number | null;
  expectedFixtureHash?: string | null;
  fixtureHash: string | null;
  seed: number;
  lane: ChamberLabLane;
  status: LabRunLifecycle;
  steps: unknown[];
  assertionResults?: LabAssertionResult[];
  observedVersions?: Record<string, number>;
  semanticDiff?: LabSemanticDelta | null;
  sideEffectCounts?: Record<string, number>;
  faultPlans?: unknown[];
  privateObservation?: LabObservation | null;
  providerPacket?: unknown;
  operatorNote?: string | null;
  linkedQaRunId?: string | null;
  gitCommit: string;
  dirty: boolean;
  startedAt: string;
  finishedAt?: string;
  store?: MemoryArtifactStore;
  /** Opt-in; default export never embeds these. */
  includePrivate?: boolean;
  providerMode?: 'offline' | 'held' | 'forbidden';
};

export function finalizeLabRunEvidence(
  input: FinalizeLabEvidenceInput,
): {
  capsule: LabRunEvidenceCapsule;
  markdown: string;
  store: MemoryArtifactStore;
} {
  if (
    input.expectedFixtureHash &&
    input.fixtureHash &&
    input.expectedFixtureHash !== input.fixtureHash
  ) {
    throw new LabEvidenceError(
      'fixture-version-mismatch',
      'Fixture hash changed; refuse same-run finalize — open a new LabRun',
    );
  }

  const store = input.store ?? createMemoryArtifactStore();
  const artifacts: LabEvidenceArtifactRef[] = [];
  const includePrivate = input.includePrivate === true;

  if (input.privateObservation) {
    const body = includePrivate
      ? input.privateObservation
      : redactLabEvidenceValue(input.privateObservation);
    artifacts.push(
      store.put({
        kind: 'private-observation',
        body,
        redactedFromDefault: !includePrivate,
      }),
    );
  }
  if (input.providerPacket !== undefined) {
    artifacts.push(
      store.put({
        kind: 'provider-packet',
        body: includePrivate
          ? input.providerPacket
          : { redacted: true },
        redactedFromDefault: !includePrivate,
      }),
    );
  }
  if (input.operatorNote) {
    artifacts.push(
      store.put({
        kind: 'operator-note',
        body: includePrivate
          ? { note: input.operatorNote }
          : { note: '<redacted>' },
        redactedFromDefault: !includePrivate,
      }),
    );
  }
  if (input.semanticDiff) {
    artifacts.push(
      store.put({
        kind: 'semantic-delta',
        body: includePrivate
          ? input.semanticDiff
          : redactLabEvidenceValue(input.semanticDiff),
        redactedFromDefault: !includePrivate,
      }),
    );
  }

  const redactedSteps = includePrivate
    ? input.steps
    : (redactLabEvidenceValue(input.steps) as unknown[]);

  const capsule = parseLabRunEvidenceCapsule({
    evidenceId: randomUUID(),
    authority: 'lab-run-machine',
    runId: input.runId,
    scenarioId: input.scenarioId ?? null,
    scenarioVersion: input.scenarioVersion ?? null,
    fixtureHash: input.fixtureHash,
    commandHash: hashJson(input.steps.map((step) => {
      if (
        step &&
        typeof step === 'object' &&
        'commandKind' in (step as object)
      ) {
        return (step as { commandKind: unknown }).commandKind;
      }
      return step;
    })),
    faultHash:
      input.faultPlans && input.faultPlans.length > 0
        ? hashJson(input.faultPlans)
        : null,
    seed: input.seed,
    gitCommit: input.gitCommit,
    dirty: input.dirty,
    lane: input.lane,
    clockPolicy: 'labeled-lab-domains',
    providerMode: input.providerMode ?? 'offline',
    steps: redactedSteps,
    assertionResults: input.assertionResults ?? [],
    observedVersions: input.observedVersions ?? {},
    // Default export keeps delta in digest-keyed artifact only.
    semanticDiff: includePrivate ? (input.semanticDiff ?? null) : null,
    sideEffectCounts: input.sideEffectCounts ?? {},
    artifacts,
    redactionLevel: includePrivate ? 'private-drilldown' : 'default',
    limits: { maxSteps: 500, maxArtifacts: 64 },
    startedAt: input.startedAt,
    finishedAt: input.finishedAt ?? new Date().toISOString(),
    status: input.status,
    replayCommand: buildReplayCommand({
      scenarioId: input.scenarioId ?? null,
      seed: input.seed,
      lane: input.lane,
    }),
    linkedQaRunId: input.linkedQaRunId ?? null,
    manualPassedIsNotMachineProof: true,
  });

  return {
    capsule,
    markdown: evidenceMarkdownSummary(capsule),
    store,
  };
}

/**
 * Freeze a capsule: any structural rewrite must allocate a new evidenceId.
 */
export function assertEvidenceImmutable(
  finalized: LabRunEvidenceCapsule,
  candidate: unknown,
): void {
  const next = parseLabRunEvidenceCapsule(candidate);
  if (next.evidenceId !== finalized.evidenceId) {
    // New ID is a fork/replay — allowed as a different capsule.
    return;
  }
  if (JSON.stringify(next) !== JSON.stringify(finalized)) {
    throw new LabEvidenceError(
      'immutable',
      'Finalized LabRun evidence cannot be mutated under the same evidenceId',
    );
  }
}

export function refuseManualAsMachineProof(args: {
  qaDisposition: string;
  labStatus?: LabRunLifecycle | null;
}): never | void {
  if (
    args.qaDisposition === 'passed' ||
    args.qaDisposition === 'manual-passed'
  ) {
    throw new LabEvidenceError(
      'authority-confusion',
      'Manual QA passed is not lab-run machine proof',
    );
  }
}
