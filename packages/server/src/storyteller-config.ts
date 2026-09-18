import {
  executionPolicySchema,
  offlineExecution,
} from '@offscreen/ai/storyteller-policy';
import { createOpenRouterProvider } from '@offscreen/ai/openrouter';

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
  return {
    provider: async (task: Parameters<typeof provider>[0]) => {
      if (JSON.stringify(task.execution) !== JSON.stringify(execution)) {
        throw new Error('Execution policy differs from approved worker policy');
      }
      return provider(task);
    },
  };
}
