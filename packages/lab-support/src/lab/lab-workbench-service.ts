/**
 * CH11: owner-scoped LabRun sessions for the developer workbench.
 * Process-local; only composed when developerTools are enabled.
 */
import { randomUUID } from 'node:crypto';
import {
  canOpenScenarioOnLane,
  type ChamberLabLane,
  type LabStepCommand,
} from '@offscreen/contracts/chamber-lab';
import {
  findChamberLabScenario,
  listChamberLabScenarios,
  searchChamberLabScenarios,
} from '../chamber-lab-catalog.js';
import { createLabRun, type LabRunHandle } from './lab-run.js';
import { diffLabObservations } from './lab-observation.js';

export class LabWorkbenchError extends Error {
  constructor(
    readonly code:
      | 'invalid'
      | 'not_found'
      | 'conflict'
      | 'unavailable'
      | 'forbidden-lane',
    message: string,
  ) {
    super(message);
    this.name = 'LabWorkbenchError';
  }
}

type OwnedRun = {
  ownerId: string;
  handle: LabRunHandle;
  scenarioId: string;
  scenarioVersion: number;
  lastObservation: unknown;
  lastDelta: unknown;
};

export type LabWorkbenchCommand =
  | { kind: 'load' }
  | { kind: 'inspect'; facets?: string[] }
  | { kind: 'advanceClock'; targetGameSecond: number }
  | { kind: 'assert'; invariantId: string; expected?: unknown }
  | { kind: 'pause' }
  | { kind: 'resume' }
  | { kind: 'reset' }
  | { kind: 'export' }
  | { kind: 'finalize' };

const COMMAND_HELP: ReadonlyArray<{
  name: string;
  params: string;
  description: string;
}> = [
  { name: 'load', params: '', description: 'Materialize the fixture specimen' },
  {
    name: 'inspect',
    params: 'facets?',
    description: 'Read authoritative facets',
  },
  {
    name: 'advanceClock',
    params: 'targetGameSecond',
    description: 'Advance labeled lab clock to a due boundary',
  },
  {
    name: 'assert',
    params: 'invariantId expected?',
    description: 'Run a structural invariant',
  },
  { name: 'pause', params: '', description: 'Pause the LabRun' },
  { name: 'resume', params: '', description: 'Resume a paused LabRun' },
  { name: 'reset', params: '', description: 'Rematerialize under same seed' },
  { name: 'export', params: '', description: 'Export step summary' },
  {
    name: 'finalize',
    params: '',
    description: 'Freeze redacted evidence capsule',
  },
];

export function createLabWorkbenchService(args?: {
  gitCommit?: string;
  dirty?: boolean;
}) {
  const runs = new Map<string, OwnedRun>();
  const gitCommit = args?.gitCommit ?? 'unknown-local';
  const dirty = args?.dirty ?? true;

  function requireOwned(ownerId: string, runId: string): OwnedRun {
    const run = runs.get(runId);
    if (!run || run.ownerId !== ownerId) {
      throw new LabWorkbenchError('not_found', 'Lab run not found for owner');
    }
    return run;
  }

  return {
    listCommands() {
      return COMMAND_HELP;
    },
    listScenarios(term?: string) {
      const scenarios = term
        ? searchChamberLabScenarios(term)
        : listChamberLabScenarios();
      return scenarios.map((scenario) => ({
        id: scenario.id,
        version: scenario.version,
        name: scenario.name,
        family: scenario.family,
        costClass: scenario.costClass,
        availabilityPerLane: scenario.availabilityPerLane,
        searchTags: scenario.searchTags,
      }));
    },
    open(args: {
      ownerId: string;
      scenarioId: string;
      scenarioVersion: number;
      lane: ChamberLabLane;
      seed?: number;
    }) {
      const scenario = findChamberLabScenario(
        args.scenarioId,
        args.scenarioVersion,
      );
      if (!scenario) {
        throw new LabWorkbenchError(
          'not_found',
          `Unknown scenario ${args.scenarioId}@${args.scenarioVersion}`,
        );
      }
      const gate = canOpenScenarioOnLane(scenario, args.lane);
      if (!gate.ok) {
        throw new LabWorkbenchError('forbidden-lane', gate.reason);
      }
      const handle = createLabRun({
        lane: args.lane,
        seed: args.seed ?? 141,
        scenarioId: args.scenarioId,
        scenarioVersion: args.scenarioVersion,
        gitCommit,
        dirty,
      });
      const runId = handle.snapshot().runId;
      runs.set(runId, {
        ownerId: args.ownerId,
        handle,
        scenarioId: args.scenarioId,
        scenarioVersion: args.scenarioVersion,
        lastObservation: null,
        lastDelta: null,
      });
      return {
        runId,
        snapshot: handle.snapshot(),
        scenarioId: args.scenarioId,
        scenarioVersion: args.scenarioVersion,
        lane: args.lane,
        unavailableReason: null as string | null,
      };
    },
    get(args: { ownerId: string; runId: string }) {
      const run = requireOwned(args.ownerId, args.runId);
      return {
        runId: args.runId,
        snapshot: run.handle.snapshot(),
        scenarioId: run.scenarioId,
        scenarioVersion: run.scenarioVersion,
        lastObservation: run.lastObservation,
        lastDelta: run.lastDelta,
        evidence: (() => {
          try {
            return run.handle.evidence();
          } catch {
            return null;
          }
        })(),
      };
    },
    async command(args: {
      ownerId: string;
      runId: string;
      command: LabWorkbenchCommand;
    }) {
      const run = requireOwned(args.ownerId, args.runId);
      const { handle } = run;
      switch (args.command.kind) {
        case 'pause':
          return { kind: 'pause', snapshot: handle.pause() };
        case 'resume':
          return { kind: 'resume', snapshot: handle.resume() };
        case 'finalize': {
          const finished = handle.finalizeEvidence();
          return {
            kind: 'finalize',
            capsule: finished.capsule,
            markdown: finished.markdown,
            replayCommand: finished.capsule.replayCommand,
          };
        }
        default:
          break;
      }

      const stepCommand = toStepCommand(args.command);
      const before =
        args.command.kind === 'advanceClock' || args.command.kind === 'assert'
          ? safeObserve(handle)
          : null;
      const result = await handle.step({
        stepId: randomUUID(),
        ordinal: handle.snapshot().nextOrdinal,
        expectedRunRevision: handle.snapshot().revision,
        command: stepCommand,
      });
      run.lastObservation = result.observation;
      if (before && result.outcome === 'ok') {
        const after = safeObserve(handle);
        if (after) {
          run.lastDelta = diffLabObservations({
            before,
            after,
            normalizeVolatile: true,
          });
        }
      }
      return {
        kind: 'step',
        result,
        snapshot: handle.snapshot(),
        lastDelta: run.lastDelta,
      };
    },
    replay(args: { ownerId: string; runId: string }) {
      const run = requireOwned(args.ownerId, args.runId);
      return this.open({
        ownerId: args.ownerId,
        scenarioId: run.scenarioId,
        scenarioVersion: run.scenarioVersion,
        lane: run.handle.snapshot().lane,
        seed: run.handle.snapshot().seed,
      });
    },
  };
}

export type LabWorkbenchService = ReturnType<typeof createLabWorkbenchService>;

function toStepCommand(command: LabWorkbenchCommand): LabStepCommand {
  switch (command.kind) {
    case 'load':
      return { kind: 'load' };
    case 'inspect':
      return {
        kind: 'inspect',
        facets: (command.facets as
          | ('activity' | 'clock' | 'items' | 'decision' | 'summary')[]
          | undefined) ?? ['summary', 'clock', 'items'],
      };
    case 'advanceClock':
      return {
        kind: 'advanceClock',
        targetGameSecond: command.targetGameSecond,
      };
    case 'assert':
      return {
        kind: 'assert',
        invariantId: command.invariantId,
        ...(command.expected !== undefined
          ? { expected: command.expected }
          : {}),
      };
    case 'reset':
      return { kind: 'reset' };
    case 'export':
      return { kind: 'export' };
    default:
      throw new LabWorkbenchError(
        'invalid',
        `Command ${command.kind} is not a step command`,
      );
  }
}

function safeObserve(handle: LabRunHandle) {
  try {
    return handle.observe();
  } catch {
    return null;
  }
}
