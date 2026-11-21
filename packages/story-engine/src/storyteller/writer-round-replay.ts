/**
 * WR09B T01: durable writer model round — strict CAS replay and shared interpreter wiring.
 */
import { eq } from 'drizzle-orm';
import type { Database } from '@offscreen/db';
import { storytellerWriterMission } from '@offscreen/db/storyteller-schema';
import type { DocumentStore } from '@offscreen/documents';
import type {
  PreparedWriterRoundTransport,
  WriterRoundModelPolicy,
} from '@offscreen/storyteller/providers/writer-round-transport';
import {
  writerSceneProposalV3Schema,
  validateWriterRoundDecisionForCapture,
  type WriterMissionCapture,
} from '@offscreen/storyteller/tasks';
import { defaultWriterContextId } from './writer-child-custody';
import {
  advanceDurableWriterMissionProviderStep,
  hashWriterMissionSerializedResponse,
  readDurableWriterMissionResponse,
} from './writer-mission-custody';
import {
  holdModelRound,
  interpretPersistedWriterDecision,
  loadModelStep,
  parseProviderDecisionBody,
  prepareWriterMissionModelStep,
  WriterLoopError,
  type WriterLoopRoundResult,
  type RunWriterMissionModelRoundInput,
} from './writer-loop';

const MAX_SERIALIZED_REQUEST_BYTES = 48 * 1024;

type WriterMissionBudgetSnapshot = {
  maxModelRounds: number;
  maxInputTokens: number;
  maxGeneratedTokens: number;
  maxMicrousd: string;
  deadlineMs: number;
};

async function loadWriterMissionBudgetSnapshot(
  database: Database,
  missionId: string,
): Promise<WriterMissionBudgetSnapshot | null> {
  const [mission] = await database.db
    .select({ budgetSnapshot: storytellerWriterMission.budgetSnapshot })
    .from(storytellerWriterMission)
    .where(eq(storytellerWriterMission.id, missionId))
    .limit(1);
  if (!mission) {
    return null;
  }
  return mission.budgetSnapshot as WriterMissionBudgetSnapshot;
}

function validateWriterRoundBudgetCeilings(
  snapshot: WriterMissionBudgetSnapshot,
  capture: WriterMissionCapture,
  policy: WriterRoundModelPolicy,
): string | null {
  const { budgets } = capture;
  if (budgets.maxModelRounds !== snapshot.maxModelRounds) {
    return 'budget_snapshot_mismatch';
  }
  const captureMicrousd = BigInt(budgets.maxMicrousd);
  const snapshotMicrousd = BigInt(snapshot.maxMicrousd);
  if (captureMicrousd !== snapshotMicrousd) {
    return 'budget_snapshot_mismatch';
  }
  if (
    policy.maxModelRounds > snapshot.maxModelRounds ||
    policy.maxMicrousd > snapshotMicrousd
  ) {
    return 'policy_budget_too_permissive';
  }
  return null;
}

type DurableRoundBase = Omit<
  RunWriterMissionModelRoundInput,
  'scriptedDecisionBody'
>;

export type RunDurableWriterMissionModelRoundInput = DurableRoundBase & {
  policy: WriterRoundModelPolicy;
  expectedWireSha256: string;
  transport: PreparedWriterRoundTransport;
};

function hasStrictResponsePointer(
  step: NonNullable<Awaited<ReturnType<typeof loadModelStep>>>,
): boolean {
  return Boolean(
    step.responseObjectHash && step.resultCasHash && step.toolCallId === null,
  );
}

function validateDurableCapture(
  capture: WriterMissionCapture,
  policy: WriterRoundModelPolicy,
): string | null {
  if (capture.version !== 'writer-mission.v3') {
    return 'invalid_capture_version';
  }
  if (capture.modelSelection.model === 'scripted-offline') {
    return 'scripted_offline_model';
  }
  if (capture.modelSelection.model !== policy.model) {
    return 'model_policy_mismatch';
  }
  const { budgets } = capture;
  if (
    !Number.isFinite(budgets.maxModelRounds) ||
    budgets.maxModelRounds <= 0 ||
    !Number.isFinite(budgets.maxInputTokens) ||
    budgets.maxInputTokens <= 0 ||
    !Number.isFinite(budgets.maxGeneratedTokens) ||
    budgets.maxGeneratedTokens <= 0 ||
    !Number.isFinite(budgets.deadlineMs) ||
    budgets.deadlineMs <= 0
  ) {
    return 'invalid_budget';
  }
  return null;
}

async function readValidatedResponseBody(
  database: Database,
  storage: DocumentStore,
  input: {
    missionId: string;
    contextId: string;
    ordinal: number;
    attemptId: string;
    requestSha256: string;
    expectedResultCasHash: string;
  },
): Promise<string> {
  const body = await readDurableWriterMissionResponse(database, storage, {
    missionId: input.missionId,
    contextId: input.contextId,
    ordinal: input.ordinal,
    attemptId: input.attemptId,
    requestSha256: input.requestSha256,
  });
  const bodyHash = hashWriterMissionSerializedResponse(body);
  if (bodyHash !== input.expectedResultCasHash) {
    throw new WriterLoopError('invalid_step_state');
  }
  return body;
}

async function rehydrateFinalProposal(
  database: Database,
  storage: DocumentStore,
  input: {
    missionId: string;
    contextId: string;
    ordinal: number;
    attemptId: string;
    requestSha256: string;
    resultCasHash: string;
    capture: WriterMissionCapture;
    wireSha256: string;
  },
): Promise<WriterLoopRoundResult> {
  const body = await readValidatedResponseBody(database, storage, {
    missionId: input.missionId,
    contextId: input.contextId,
    ordinal: input.ordinal,
    attemptId: input.attemptId,
    requestSha256: input.requestSha256,
    expectedResultCasHash: input.resultCasHash,
  });
  const decision = parseProviderDecisionBody(body);
  if (!decision || decision.kind !== 'final') {
    throw new WriterLoopError('malformed_decision');
  }
  try {
    validateWriterRoundDecisionForCapture(input.capture, decision);
  } catch {
    throw new WriterLoopError('malformed_decision');
  }
  if (
    input.capture.version === 'writer-mission.v3' &&
    decision.proposal.version === 3
  ) {
    writerSceneProposalV3Schema.parse(decision.proposal);
  }
  return {
    status: 'proposal-ready',
    proposal: decision,
    wireSha256: input.wireSha256,
  };
}

export async function runDurableWriterMissionModelRound(
  database: Database,
  input: RunDurableWriterMissionModelRoundInput,
): Promise<WriterLoopRoundResult> {
  const contextId = defaultWriterContextId(input.missionId, input.contextId);
  const prepared = await prepareWriterMissionModelStep(
    database,
    input.storage,
    {
      missionId: input.missionId,
      contextId,
      ordinal: input.ordinal,
      expectedRevision: input.expectedRevision,
      capture: input.capture,
    },
  );
  const wireSha256 = prepared.wireSha256;

  const captureHold = validateDurableCapture(input.capture, input.policy);
  if (captureHold) {
    const step = await loadModelStep(
      database,
      input.missionId,
      input.ordinal,
      contextId,
    );
    if (step) {
      return holdModelRound(database, {
        missionId: input.missionId,
        contextId,
        ordinal: input.ordinal,
        revision: step.revision,
        reason: captureHold,
        transportInvoked: false,
      }).then((held) => ({ ...held, wireSha256 }));
    }
    return {
      status: 'held',
      reason: captureHold,
      wireSha256,
      transportInvoked: false,
    };
  }

  const preStep = await loadModelStep(
    database,
    input.missionId,
    input.ordinal,
    contextId,
  );
  if (!preStep) {
    throw new WriterLoopError('step_not_found');
  }

  if (input.expectedWireSha256 !== wireSha256) {
    const held = await holdModelRound(database, {
      missionId: input.missionId,
      contextId,
      ordinal: input.ordinal,
      revision: preStep.revision,
      reason: 'wire_hash_mismatch',
      transportInvoked: false,
    });
    return { ...held, wireSha256 };
  }
  if (preStep.requestCasHash !== input.expectedWireSha256) {
    const held = await holdModelRound(database, {
      missionId: input.missionId,
      contextId,
      ordinal: input.ordinal,
      revision: preStep.revision,
      reason: 'request_cas_mismatch',
      transportInvoked: false,
    });
    return { ...held, wireSha256 };
  }

  const responseIdentity = {
    missionId: input.missionId,
    contextId,
    ordinal: input.ordinal,
    attemptId: preStep.attemptId ?? input.attemptId,
    requestSha256: preStep.requestCasHash,
  };

  if (preStep.state === 'held' || preStep.state === 'failed') {
    return {
      status: 'held',
      reason: preStep.state,
      wireSha256: preStep.requestCasHash,
      transportInvoked: false,
    };
  }
  if (preStep.state === 'uncertain' || preStep.state === 'dispatched') {
    return { status: 'uncertain', transportInvoked: false };
  }
  if (preStep.state === 'tools-applied') {
    return {
      status: 'replayed',
      wireSha256: preStep.requestCasHash,
      transportInvoked: false,
    };
  }
  if (preStep.state === 'proposal-ready') {
    if (!hasStrictResponsePointer(preStep) || !preStep.resultCasHash) {
      return {
        status: 'held',
        reason: 'strict_response_pointer_missing',
        wireSha256: preStep.requestCasHash,
        transportInvoked: false,
      };
    }
    return rehydrateFinalProposal(database, input.storage, {
      ...responseIdentity,
      resultCasHash: preStep.resultCasHash,
      capture: input.capture,
      wireSha256: preStep.requestCasHash,
    });
  }
  if (preStep.state === 'result-settled') {
    if (!hasStrictResponsePointer(preStep) || !preStep.resultCasHash) {
      return {
        status: 'held',
        reason: 'strict_response_pointer_missing',
        wireSha256: preStep.requestCasHash,
        transportInvoked: false,
      };
    }
    const body = await readValidatedResponseBody(database, input.storage, {
      ...responseIdentity,
      expectedResultCasHash: preStep.resultCasHash,
    });
    return interpretPersistedWriterDecision(database, {
      missionId: input.missionId,
      contextId,
      ordinal: input.ordinal,
      capture: input.capture,
      access: input.access,
      reader: input.reader,
      storage: input.storage,
      body,
      resultCasHash: preStep.resultCasHash,
      wireSha256: preStep.requestCasHash,
      transportInvoked: false,
    });
  }

  const missionBudget = await loadWriterMissionBudgetSnapshot(
    database,
    input.missionId,
  );
  if (!missionBudget) {
    throw new WriterLoopError('invalid_step_state');
  }
  const budgetHold = validateWriterRoundBudgetCeilings(
    missionBudget,
    input.capture,
    input.policy,
  );
  if (budgetHold) {
    return holdModelRound(database, {
      missionId: input.missionId,
      contextId,
      ordinal: input.ordinal,
      revision: preStep.revision,
      reason: budgetHold,
      transportInvoked: false,
    }).then((held) => ({ ...held, wireSha256 }));
  }

  const custody = await advanceDurableWriterMissionProviderStep(
    database,
    input.storage,
    {
      missionId: input.missionId,
      contextId,
      ordinal: input.ordinal,
      attemptId: input.attemptId,
      expectedRevision: prepared.revision,
      providerPolicy: input.policy,
      expectedWireSha256: input.expectedWireSha256,
      requestBytes: MAX_SERIALIZED_REQUEST_BYTES,
    },
    input.transport,
  );

  if (custody.status === 'held') {
    return {
      status: 'held',
      reason: custody.reason,
      wireSha256,
      transportInvoked: custody.transportInvoked,
    };
  }
  if (custody.status === 'uncertain') {
    return {
      status: 'uncertain',
      transportInvoked: custody.transportInvoked,
    };
  }
  if (custody.status === 'failed') {
    return {
      status: 'held',
      reason: custody.reason,
      wireSha256,
      transportInvoked: custody.transportInvoked,
    };
  }

  if (custody.status === 'replayed') {
    if (custody.stepState === 'tools-applied') {
      return {
        status: 'replayed',
        wireSha256,
        transportInvoked: false,
      };
    }
    const step = await loadModelStep(
      database,
      input.missionId,
      input.ordinal,
      contextId,
    );
    if (!step?.resultCasHash || !hasStrictResponsePointer(step)) {
      return {
        status: 'held',
        reason: 'strict_response_pointer_missing',
        wireSha256,
        transportInvoked: false,
      };
    }
    if (custody.stepState === 'proposal-ready') {
      return rehydrateFinalProposal(database, input.storage, {
        missionId: input.missionId,
        contextId,
        ordinal: input.ordinal,
        attemptId: step.attemptId ?? input.attemptId,
        requestSha256: step.requestCasHash,
        resultCasHash: step.resultCasHash,
        capture: input.capture,
        wireSha256,
      });
    }
    const body = await readValidatedResponseBody(database, input.storage, {
      missionId: input.missionId,
      contextId,
      ordinal: input.ordinal,
      attemptId: step.attemptId ?? input.attemptId,
      requestSha256: step.requestCasHash,
      expectedResultCasHash: step.resultCasHash,
    });
    return interpretPersistedWriterDecision(database, {
      missionId: input.missionId,
      contextId,
      ordinal: input.ordinal,
      capture: input.capture,
      access: input.access,
      reader: input.reader,
      storage: input.storage,
      body,
      resultCasHash: step.resultCasHash,
      wireSha256,
      transportInvoked: false,
    });
  }

  if (custody.status !== 'delivered' || !custody.resultCasHash) {
    throw new WriterLoopError('invalid_step_state');
  }

  const stepAfterDelivery = await loadModelStep(
    database,
    input.missionId,
    input.ordinal,
    contextId,
  );
  if (!stepAfterDelivery) {
    throw new WriterLoopError('step_not_found');
  }

  const body = await readValidatedResponseBody(database, input.storage, {
    missionId: input.missionId,
    contextId,
    ordinal: input.ordinal,
    attemptId: stepAfterDelivery.attemptId ?? input.attemptId,
    requestSha256: stepAfterDelivery.requestCasHash,
    expectedResultCasHash: custody.resultCasHash,
  });

  return interpretPersistedWriterDecision(database, {
    missionId: input.missionId,
    contextId,
    ordinal: input.ordinal,
    capture: input.capture,
    access: input.access,
    reader: input.reader,
    storage: input.storage,
    body,
    resultCasHash: custody.resultCasHash,
    wireSha256,
    transportInvoked: custody.transportInvoked,
  });
}
