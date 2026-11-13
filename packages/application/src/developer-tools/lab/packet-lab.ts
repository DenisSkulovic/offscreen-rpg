/**
 * CH14: held Storyteller packet captures → LabRun evidence (zero spend).
 * Does not replace DispatchReview or authorize live release.
 */
import { createHash, randomUUID } from 'node:crypto';
import {
  finalizeLabRunEvidence,
  redactLabEvidenceValue,
} from './lab-evidence.js';
import type { LabRunEvidenceCapsule } from '@offscreen/contracts/chamber-lab';

export class PacketLabError extends Error {
  constructor(
    readonly code:
      | 'dispatch-tripwire'
      | 'live-unauthorized'
      | 'hash-mismatch'
      | 'not-held'
      | 'nonzero-charge',
    message: string,
  ) {
    super(message);
    this.name = 'PacketLabError';
  }
}

export type HeldPacketSnapshot = {
  generationId: string;
  packetHash: string;
  state: 'prepared' | 'held' | 'rejected' | 'uncertain' | 'settled';
  selectedRoute: string | null;
  estimatedInputBytes: number;
  estimatedBudgetMicrousd: number;
  providerAttempts: number;
  verifiedChargeMicrousd: number;
  /** Private — never in default export. */
  rawPrompt?: string;
  providerReply?: string;
  /** Tripwire: true means an HTTP provider dispatch was attempted. */
  dispatchAttempted?: boolean;
};

export type PacketLabMode = 'held' | 'authorized-live';

export function assertHeldPacketSafe(snapshot: HeldPacketSnapshot): void {
  if (snapshot.dispatchAttempted === true) {
    throw new PacketLabError(
      'dispatch-tripwire',
      'Held/offline packet lab detected provider HTTP dispatch attempt',
    );
  }
  if (snapshot.providerAttempts !== 0 || snapshot.verifiedChargeMicrousd !== 0) {
    throw new PacketLabError(
      'nonzero-charge',
      'Held packet must show zero provider attempts and zero charge',
    );
  }
  if (snapshot.state !== 'held' && snapshot.state !== 'prepared') {
    throw new PacketLabError(
      'not-held',
      `Packet state ${snapshot.state} is not a held capture`,
    );
  }
}

export function refuseUnauthorizedLiveRelease(args: {
  mode: PacketLabMode;
  explicitRoute?: string | null;
  explicitCapMicrousd?: number | null;
  authorizeToken?: string | null;
}): void {
  if (args.mode !== 'authorized-live') return;
  if (
    !args.explicitRoute ||
    args.explicitCapMicrousd == null ||
    args.explicitCapMicrousd <= 0 ||
    !args.authorizeToken
  ) {
    throw new PacketLabError(
      'live-unauthorized',
      'authorized-live release requires fresh route, positive cap, and authorize token',
    );
  }
}

export function materializeHeldPacketEvidence(args: {
  snapshot: HeldPacketSnapshot;
  expectedHash?: string;
  gitCommit?: string;
  dirty?: boolean;
  seed?: number;
}): {
  capsule: LabRunEvidenceCapsule;
  markdown: string;
  reproduction: string;
  safeInspection: Record<string, unknown>;
} {
  assertHeldPacketSafe(args.snapshot);
  if (
    args.expectedHash &&
    args.expectedHash !== args.snapshot.packetHash
  ) {
    throw new PacketLabError(
      'hash-mismatch',
      'Held packet hash does not match expected capture',
    );
  }

  const safeInspection = {
    generationId: args.snapshot.generationId,
    packetHash: args.snapshot.packetHash,
    state: args.snapshot.state,
    selectedRoute: args.snapshot.selectedRoute,
    estimatedInputBytes: args.snapshot.estimatedInputBytes,
    estimatedBudgetMicrousd: args.snapshot.estimatedBudgetMicrousd,
    providerAttempts: args.snapshot.providerAttempts,
    verifiedChargeMicrousd: args.snapshot.verifiedChargeMicrousd,
    dispatchAttempted: false,
  };

  const finished = finalizeLabRunEvidence({
    runId: randomUUID(),
    scenarioId: 'held-opening-packet',
    scenarioVersion: 1,
    fixtureHash: createHash('sha256')
      .update(args.snapshot.packetHash)
      .digest('hex'),
    seed: args.seed ?? 0,
    lane: 'held-packet',
    status: 'completed',
    steps: [
      {
        commandKind: 'packet-capture',
        ...safeInspection,
      },
    ],
    sideEffectCounts: {
      providerAttempts: 0,
      verifiedChargeMicrousd: 0,
    },
    providerPacket: {
      prompt: args.snapshot.rawPrompt ?? '<absent>',
      providerReply: args.snapshot.providerReply ?? '<absent>',
      authorization: 'Bearer sk-should-never-leak',
    },
    providerMode: 'held',
    gitCommit: args.gitCommit ?? 'packet-lab-local',
    dirty: args.dirty ?? true,
    startedAt: new Date().toISOString(),
  });

  const reproduction = `pnpm chamber:packet  # generation ${args.snapshot.generationId} hash ${args.snapshot.packetHash}`;

  const serialized = JSON.stringify(finished.capsule);
  if (
    serialized.includes('sk-should-never-leak') ||
    (args.snapshot.rawPrompt &&
      serialized.includes(args.snapshot.rawPrompt))
  ) {
    throw new PacketLabError(
      'dispatch-tripwire',
      'Default evidence leaked private provider payload',
    );
  }

  return {
    capsule: finished.capsule,
    markdown: finished.markdown,
    reproduction,
    safeInspection: redactLabEvidenceValue(safeInspection) as Record<
      string,
      unknown
    >,
  };
}
