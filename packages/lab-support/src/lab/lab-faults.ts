/**
 * CH08: run-scoped FaultPlan registry and fake-adapter cut points.
 * Test-only composition — never registered by ordinary Nest API.
 */
import { createHash, randomUUID } from 'node:crypto';
import {
  parseLabFaultPlan,
  type LabFaultCutPoint,
  type LabFaultPlan,
} from '@offscreen/contracts/chamber-lab';
import { createChamberStorytellerControl } from '../storyteller-control.js';

export class LabFaultError extends Error {
  constructor(
    readonly code:
      | 'cross-run'
      | 'not-armed'
      | 'already-armed'
      | 'unknown-fault'
      | 'body-conflict'
      | 'forgotten-disarm'
      | 'unsupported-cut-point',
    message: string,
  ) {
    super(message);
    this.name = 'LabFaultError';
  }
}

export type ArmedFault = LabFaultPlan & {
  armed: boolean;
  remainingTriggers: number;
  trips: number;
};

export type OperationRecord = {
  operationId: string;
  runId: string;
  payloadHash: string;
  committed: boolean;
  acked: boolean;
  effectCount: number;
  deliveries: number;
};

function payloadHash(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

/**
 * In-memory seam for after-commit-before-ack and duplicate-delivery.
 * Lost ACK does not undo commit; same payload retries idempotently.
 */
export function createCommitAckFaultAdapter() {
  const operations = new Map<string, OperationRecord>();

  return {
    commit(args: {
      runId: string;
      operationId: string;
      payload: unknown;
      dropAck: boolean;
    }): OperationRecord {
      const hash = payloadHash(args.payload);
      const existing = operations.get(args.operationId);
      if (existing) {
        if (existing.payloadHash !== hash) {
          throw new LabFaultError(
            'body-conflict',
            'Same operationId with different payload conflicts',
          );
        }
        if (existing.runId !== args.runId) {
          throw new LabFaultError(
            'cross-run',
            'Operation belongs to another LabRun',
          );
        }
        return { ...existing };
      }
      const record: OperationRecord = {
        operationId: args.operationId,
        runId: args.runId,
        payloadHash: hash,
        committed: true,
        acked: !args.dropAck,
        effectCount: 1,
        deliveries: 0,
      };
      operations.set(args.operationId, record);
      return { ...record };
    },
    ack(args: { runId: string; operationId: string; payload: unknown }) {
      const hash = payloadHash(args.payload);
      const existing = operations.get(args.operationId);
      if (!existing) {
        throw new LabFaultError('unknown-fault', 'No committed operation to ACK');
      }
      if (existing.runId !== args.runId) {
        throw new LabFaultError('cross-run', 'ACK rejected for foreign run');
      }
      if (existing.payloadHash !== hash) {
        throw new LabFaultError(
          'body-conflict',
          'ACK payload does not match committed body',
        );
      }
      existing.acked = true;
      return { ...existing };
    },
    deliver(args: {
      runId: string;
      operationId: string;
      payload: unknown;
      allowDuplicate: boolean;
    }): OperationRecord {
      const hash = payloadHash(args.payload);
      const existing = operations.get(args.operationId);
      if (!existing || !existing.committed) {
        throw new LabFaultError(
          'unknown-fault',
          'Delivery requires a committed operation',
        );
      }
      if (existing.runId !== args.runId) {
        throw new LabFaultError(
          'cross-run',
          'Delivery rejected for foreign run',
        );
      }
      if (existing.payloadHash !== hash) {
        throw new LabFaultError(
          'body-conflict',
          'Duplicate delivery payload mismatch',
        );
      }
      existing.deliveries += 1;
      if (existing.deliveries > 1 && !args.allowDuplicate) {
        // Idempotent: effect already applied; do not increment effectCount.
        return { ...existing };
      }
      if (existing.deliveries === 1) {
        // First delivery observes the committed effect; count stays 1.
        return { ...existing };
      }
      // Duplicate path: still exactly one effect.
      return { ...existing };
    },
    read(operationId: string) {
      const record = operations.get(operationId);
      return record ? { ...record } : null;
    },
    clear() {
      operations.clear();
    },
  };
}

export type CommitAckFaultAdapter = ReturnType<typeof createCommitAckFaultAdapter>;

export function createLabFaultRegistry() {
  const armed = new Map<string, ArmedFault>();
  const storyteller = createChamberStorytellerControl();
  const commitAck = createCommitAckFaultAdapter();

  function key(runId: string, faultId: string) {
    return `${runId}::${faultId}`;
  }

  function listArmed(runId: string) {
    return [...armed.values()].filter((fault) => fault.runId === runId);
  }

  function disarmAll(runId: string) {
    for (const fault of listArmed(runId)) {
      armed.delete(key(runId, fault.faultId));
    }
  }

  function assertOwned(runId: string, fault: ArmedFault) {
    if (fault.runId !== runId) {
      throw new LabFaultError(
        'cross-run',
        `Fault ${fault.faultId} belongs to another run`,
      );
    }
  }

  return {
    storyteller,
    commitAck,
    arm(input: unknown): ArmedFault {
      const plan = parseLabFaultPlan(input);
      const id = key(plan.runId, plan.faultId);
      if (armed.has(id)) {
        throw new LabFaultError(
          'already-armed',
          `Fault ${plan.faultId} already armed on run ${plan.runId}`,
        );
      }
      const supported: LabFaultCutPoint[] = [
        'after-commit-before-ack',
        'duplicate-delivery',
        'held-storyteller-consequence',
      ];
      if (!supported.includes(plan.cutPoint)) {
        throw new LabFaultError(
          'unsupported-cut-point',
          `Cut point ${plan.cutPoint} is not wired in CH08 adapters`,
        );
      }
      if (
        plan.cutPoint === 'held-storyteller-consequence' &&
        plan.storyId
      ) {
        const current = storyteller.read(plan.storyId);
        storyteller.arm(plan.storyId, current.revision, 'hold');
      }
      const next: ArmedFault = {
        ...plan,
        armed: true,
        remainingTriggers: plan.triggerCount,
        trips: 0,
      };
      armed.set(id, next);
      return { ...next };
    },
    disarm(args: { runId: string; faultId: string }) {
      const id = key(args.runId, args.faultId);
      const fault = armed.get(id);
      if (!fault) {
        throw new LabFaultError(
          'not-armed',
          `Fault ${args.faultId} is not armed on run ${args.runId}`,
        );
      }
      assertOwned(args.runId, fault);
      if (
        fault.cutPoint === 'held-storyteller-consequence' &&
        fault.storyId
      ) {
        const current = storyteller.read(fault.storyId);
        storyteller.clear(fault.storyId, current.revision);
      }
      armed.delete(id);
      return { faultId: args.faultId, runId: args.runId, armed: false };
    },
    trip(args: {
      runId: string;
      faultId: string;
    }): { tripped: boolean; fault: ArmedFault | null } {
      const fault = armed.get(key(args.runId, args.faultId));
      if (!fault) {
        return { tripped: false, fault: null };
      }
      assertOwned(args.runId, fault);
      if (fault.remainingTriggers <= 0) {
        return { tripped: false, fault: { ...fault } };
      }
      fault.remainingTriggers -= 1;
      fault.trips += 1;
      return { tripped: true, fault: { ...fault } };
    },
    /**
     * Execute the three CH08 seams against fake adapters / storyteller control.
     * GET/read paths never dispatch provider work.
     */
    exercise(args: {
      runId: string;
      faultId: string;
      operationId?: string;
      payload?: unknown;
      generationId?: string;
    }) {
      const fault = armed.get(key(args.runId, args.faultId));
      if (!fault) {
        throw new LabFaultError(
          'not-armed',
          `Fault ${args.faultId} is not armed`,
        );
      }
      assertOwned(args.runId, fault);
      const operationId = args.operationId ?? fault.targetOperationId ?? randomUUID();
      const payload = args.payload ?? { operationId, intent: 'lab' };
      const trip = this.trip({ runId: args.runId, faultId: args.faultId });
      if (!trip.tripped) {
        return {
          cutPoint: fault.cutPoint,
          tripped: false,
          observation: { reason: 'trigger-exhausted' },
        };
      }

      if (fault.cutPoint === 'after-commit-before-ack') {
        const committed = commitAck.commit({
          runId: args.runId,
          operationId,
          payload,
          dropAck: true,
        });
        // Lost ACK: commit remains; retry ACK with same body.
        const acked = commitAck.ack({
          runId: args.runId,
          operationId,
          payload,
        });
        return {
          cutPoint: fault.cutPoint,
          tripped: true,
          observation: {
            committed: committed.committed,
            ackedAfterRetry: acked.acked,
            effectCount: acked.effectCount,
            expectedObservation: fault.expectedObservation,
          },
        };
      }

      if (fault.cutPoint === 'duplicate-delivery') {
        commitAck.commit({
          runId: args.runId,
          operationId,
          payload,
          dropAck: false,
        });
        const first = commitAck.deliver({
          runId: args.runId,
          operationId,
          payload,
          allowDuplicate: true,
        });
        const second = commitAck.deliver({
          runId: args.runId,
          operationId,
          payload,
          allowDuplicate: true,
        });
        return {
          cutPoint: fault.cutPoint,
          tripped: true,
          observation: {
            deliveries: second.deliveries,
            effectCount: second.effectCount,
            firstDeliveries: first.deliveries,
            expectedObservation: fault.expectedObservation,
          },
        };
      }

      if (fault.cutPoint === 'held-storyteller-consequence') {
        if (!fault.storyId) {
          throw new LabFaultError(
            'unsupported-cut-point',
            'held-storyteller-consequence requires storyId',
          );
        }
        const generationId = args.generationId ?? randomUUID();
        // Minimal pending stub — control only reads task + source.storyId.
        const decision = storyteller.evaluate({
          generationId,
          task: {
            task: 'pending-consequence',
            source: { storyId: fault.storyId },
          } as Parameters<typeof storyteller.evaluate>[0]['task'],
        });
        return {
          cutPoint: fault.cutPoint,
          tripped: true,
          observation: {
            decision,
            storyteller: storyteller.read(fault.storyId),
            expectedObservation: fault.expectedObservation,
            providerDispatched: false,
          },
        };
      }

      throw new LabFaultError(
        'unsupported-cut-point',
        `No exercise path for ${fault.cutPoint}`,
      );
    },
    list(runId: string) {
      return listArmed(runId).map((fault) => ({ ...fault }));
    },
    cleanup(runId: string) {
      const leftover = listArmed(runId);
      disarmAll(runId);
      if (leftover.length > 0) {
        return {
          cleaned: leftover.map((fault) => fault.faultId),
          forgottenDisarmCaught: true,
        };
      }
      return { cleaned: [] as string[], forgottenDisarmCaught: false };
    },
    assertNoArmed(runId: string) {
      const leftover = listArmed(runId);
      if (leftover.length > 0) {
        throw new LabFaultError(
          'forgotten-disarm',
          `Run ${runId} still has armed faults: ${leftover
            .map((fault) => fault.faultId)
            .join(', ')}`,
        );
      }
    },
  };
}

export type LabFaultRegistry = ReturnType<typeof createLabFaultRegistry>;
