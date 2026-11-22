import type { WriterRoundModelPolicy } from '@offscreen/storyteller/providers/writer-round-transport';
import type { WriterMissionCapture } from '@offscreen/storyteller/tasks';

export const SCRIPTED_OFFLINE_MODEL = 'scripted-offline' as const;

export type WriterRoundCapturePolicyMode =
  | 'provider-default'
  | 'provider-authorized'
  | 'scripted-offline-lab';

type WriterMissionBudgetSnapshot = WriterMissionCapture['budgets'];

/** Mode-aware capture validation shared by GA private seam and durable replay. */
export function validateWriterRoundCaptureAgainstPolicy(
  capture: WriterMissionCapture,
  policy: WriterRoundModelPolicy,
  budgetSnapshot: WriterMissionBudgetSnapshot,
  mode: WriterRoundCapturePolicyMode,
): string | null {
  if (capture.version !== 'writer-mission.v3') {
    return 'invalid_capture_version';
  }

  const captureModel = capture.modelSelection.model;
  const policyModel = policy.model;

  if (mode === 'scripted-offline-lab') {
    if (policyModel !== SCRIPTED_OFFLINE_MODEL) {
      return 'model_policy_mismatch';
    }
    if (captureModel !== SCRIPTED_OFFLINE_MODEL) {
      return 'model_policy_mismatch';
    }
    if (capture.providerPolicy !== undefined) {
      return 'model_policy_mismatch';
    }
  } else if (mode === 'provider-authorized') {
    if (captureModel !== policyModel) {
      return 'model_policy_mismatch';
    }
    const pin = capture.providerPolicy;
    if (
      pin === undefined ||
      pin.version !== policy.priceVersion ||
      pin.model !== policy.model
    ) {
      return 'model_policy_mismatch';
    }
  } else {
    if (captureModel === SCRIPTED_OFFLINE_MODEL) {
      return 'scripted_offline_model';
    }
    if (captureModel !== policyModel) {
      return 'model_policy_mismatch';
    }
  }

  const captureMicrousd = BigInt(capture.budgets.maxMicrousd);
  const snapshotMicrousd = BigInt(budgetSnapshot.maxMicrousd);
  if (captureMicrousd !== snapshotMicrousd) {
    return 'budget_snapshot_mismatch';
  }
  if (capture.budgets.maxModelRounds !== budgetSnapshot.maxModelRounds) {
    return 'budget_snapshot_mismatch';
  }
  if (
    policy.maxModelRounds > budgetSnapshot.maxModelRounds ||
    policy.maxMicrousd > snapshotMicrousd
  ) {
    return 'policy_budget_too_permissive';
  }
  return null;
}