import type {
  ExecutePreparedWriterRoundWorkflowInput,
  WriterSceneRoundExecutionPlan,
  WriterSceneRoundExecutorResult,
  WriterSceneRoundFinalizeResult,
  WriterSceneRoundMissionState,
} from './contracts';

export type WriterSceneDistributedV2RoundLoopDeps = {
  planWriterSceneRound(missionId: string): Promise<WriterSceneRoundExecutionPlan>;
  readWriterSceneRoundMissionState(
    missionId: string,
  ): Promise<WriterSceneRoundMissionState>;
  executePreparedWriterRound(
    input: ExecutePreparedWriterRoundWorkflowInput,
  ): Promise<WriterSceneRoundExecutorResult>;
  finalizeWriterSceneRound(
    missionId: string,
  ): Promise<WriterSceneRoundFinalizeResult>;
  nextAttemptId(): string;
  holdWriterSceneRound(message: string): never;
  uncertainWriterSceneRound(message: string): never;
  failWriterSceneExecutor(message: string): never;
};

function terminalMissionState(
  state: WriterSceneRoundMissionState,
  hold: (message: string) => never,
  uncertain: (message: string) => never,
): 'pending' | 'done' {
  if (state.status === 'published' || state.status === 'replayed') {
    return 'done';
  }
  if (state.status === 'pending') {
    return 'pending';
  }
  if (state.status === 'held') {
    hold(state.reason ?? 'writer-scene-round-held');
  }
  uncertain(state.reason ?? 'writer-scene-round-uncertain');
}

function terminalFinalize(
  finalized: WriterSceneRoundFinalizeResult,
  hold: (message: string) => never,
  uncertain: (message: string) => never,
): 'done' | 'needs-next-round' {
  if (finalized.status === 'published' || finalized.status === 'replayed') {
    return 'done';
  }
  if (finalized.status === 'needs-next-round') {
    return 'needs-next-round';
  }
  if (finalized.status === 'held') {
    hold(finalized.reason ?? 'writer-scene-round-held');
  }
  uncertain(finalized.reason ?? 'writer-scene-round-uncertain');
}

/** Bounded plan → execute → finalize loop for writerSceneDistributedV2. */
export async function runWriterSceneDistributedV2RoundLoop(
  missionId: string,
  deps: WriterSceneDistributedV2RoundLoopDeps,
): Promise<void> {
  let loopIterations = 0;

  while (true) {
    const plan = await deps.planWriterSceneRound(missionId);
    loopIterations += 1;
    if (loopIterations > plan.maxModelRounds) {
      deps.holdWriterSceneRound('writer-scene-round-max-iterations');
    }
    if (plan.ordinal > plan.maxModelRounds) {
      deps.holdWriterSceneRound('writer-scene-round-ordinal-exceeds-max');
    }

    const attemptId = deps.nextAttemptId();
    const executorResult = await deps.executePreparedWriterRound({
      missionId: plan.missionId,
      contextId: plan.contextId,
      ordinal: plan.ordinal,
      expectedRevision: plan.expectedRevision,
      attemptId,
    });

    if (executorResult.status === 'replayed') {
      const missionState = await deps.readWriterSceneRoundMissionState(missionId);
      if (terminalMissionState(
        missionState,
        deps.holdWriterSceneRound,
        deps.uncertainWriterSceneRound,
      ) === 'done') {
        return;
      }
    } else if (executorResult.status === 'held') {
      deps.holdWriterSceneRound(
        executorResult.reason ?? 'writer-scene-executor-held',
      );
    } else if (executorResult.status === 'uncertain') {
      deps.uncertainWriterSceneRound(
        executorResult.reason ?? 'writer-scene-executor-uncertain',
      );
    } else if (executorResult.status === 'failed') {
      deps.failWriterSceneExecutor(
        executorResult.reason ?? 'writer-scene-executor-failed',
      );
    }

    const finalized = await deps.finalizeWriterSceneRound(missionId);
    if (terminalFinalize(
      finalized,
      deps.holdWriterSceneRound,
      deps.uncertainWriterSceneRound,
    ) === 'done') {
      return;
    }
  }
}