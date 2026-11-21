import {
  executionPolicySchema,
  offlineExecution,
  type ExecutionPolicy,
  type StorytellerTask,
} from '@offscreen/storyteller/tasks';
import {
  createOpenRouterProvider,
  type StorytellerProvider,
  type StorytellerProviderDispatch,
} from '@offscreen/storyteller/providers/openrouter';

/** Explicit opt-in only. A credential alone never selects a provider or creates an allowance. */
export function readStorytellerExecution(env: NodeJS.ProcessEnv) {
  if (env['STORYTELLER_LIVE_ENABLED'] !== 'true') {
    return offlineExecution;
  }
  const serialized = env['STORYTELLER_EXECUTION_JSON'];
  if (!serialized) {
    throw new Error('Missing explicitly approved storyteller execution policy');
  }
  const execution = executionPolicySchema.parse(JSON.parse(serialized));
  if (execution.mode !== 'provider') {
    throw new Error('Live execution requires a provider policy');
  }
  return execution;
}

/**
 * OBS00-A: worker provider adapter that preserves the frozen per-round dispatch.
 * Must never silently drop the second argument or rewrite request bodies.
 */
export function wrapApprovedWorkerProvider(
  provider: StorytellerProvider,
  approvedExecution: ExecutionPolicy,
): StorytellerProvider {
  const assertApproved = (task: StorytellerTask) => {
    if (JSON.stringify(task.execution) !== JSON.stringify(approvedExecution)) {
      throw new Error('Execution policy differs from approved worker policy');
    }
  };
  const wrapped: StorytellerProvider = async (task, dispatch) => {
    assertApproved(task);
    return provider(task, dispatch);
  };
  // OBS00-C: forward the pure wire attestation (never invent one). A wrapped
  // provider without `prepareWire` stays unattested and is refused pre-send.
  const prepareWire = provider.prepareWire;
  if (!prepareWire) return wrapped;
  return Object.assign(wrapped, {
    prepareWire: (
      task: StorytellerTask,
      dispatch?: StorytellerProviderDispatch,
    ) => {
      assertApproved(task);
      return prepareWire.call(provider, task, dispatch);
    },
  });
}

export function readStorytellerWorkerOptions(env: NodeJS.ProcessEnv) {
  const execution = readStorytellerExecution(env);
  if (execution.mode !== 'provider') {
    return {};
  }
  const provider = createOpenRouterProvider({
    enabled: true,
    apiKey: env['OPENROUTER_API_KEY'] ?? '',
  });
  // A worker cannot silently run a queued policy using a newly selected route/run.
  // Does not supply dispatchAuthority (OBS00-B); paid sends stay denied until that exists.
  return {
    provider: wrapApprovedWorkerProvider(provider, execution),
  };
}
