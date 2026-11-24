/**
 * SA06: deterministic TaskEvidenceNeed from structured source-known inputs.
 * Never uses prose regex or a preparatory model call as authority.
 */
import { z } from 'zod';
import type { CreativeExplorationPosture } from '@offscreen/storyteller/context/creative-exploration';

export const taskEvidenceNeedSchema = z.strictObject({
  version: z.literal('task-evidence-need.v1'),
  purpose: z.string().trim().min(1).max(240),
  mandatoryComplete: z.boolean(),
  missingExactSourceRefs: z.array(z.string().trim().min(1).max(240)).max(32),
  olderNamedEntityRefs: z.array(z.string().trim().min(1).max(240)).max(32),
  activeSceneNeedsHistory: z.boolean(),
  creativePreference: z.enum(['off', 'minimal', 'balanced', 'rich']),
  alreadyResolvedByLoadedSource: z.boolean(),
  reasons: z.array(z.string().trim().min(1).max(240)).min(1).max(16),
});

export type TaskEvidenceNeed = z.infer<typeof taskEvidenceNeedSchema>;

export type TaskEvidenceNeedInput = Readonly<{
  purpose: string;
  /** Handles/refs that must be present for a safe task. */
  mandatorySourceRefs?: readonly string[];
  /** Handles already available in the captured/loaded context. */
  availableSourceRefs?: readonly string[];
  /** Explicitly known missing exact sources (not inferred from prose). */
  missingExactSourceRefs?: readonly string[];
  /** Explicit older identity/relationship/source refs that may need discovery. */
  olderNamedEntityRefs?: readonly string[];
  /** Captured creative posture preference; never a funding tier. */
  creativePreference?: CreativeExplorationPosture;
  /** True when active-scene scope spans older history that may need recall. */
  activeSceneNeedsHistory?: boolean;
}>;

function unique(values: readonly string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

/**
 * Pure need classifier. Player text asking for “five research rounds” is ignored
 * unless expressed as structured missingExactSourceRefs / olderNamedEntityRefs.
 */
export function assessTaskEvidenceNeed(
  input: TaskEvidenceNeedInput,
): TaskEvidenceNeed {
  const available = new Set(unique(input.availableSourceRefs ?? []));
  const mandatory = unique(input.mandatorySourceRefs ?? []);
  const missingFromMandatory = mandatory.filter((ref) => !available.has(ref));
  const missingExact = unique([
    ...(input.missingExactSourceRefs ?? []),
    ...missingFromMandatory,
  ]);
  const older = unique(input.olderNamedEntityRefs ?? []).filter(
    (ref) => !available.has(ref),
  );
  const creativePreference = input.creativePreference ?? 'off';
  const activeSceneNeedsHistory = input.activeSceneNeedsHistory === true;
  const mandatoryComplete = missingFromMandatory.length === 0;
  const alreadyResolvedByLoadedSource =
    missingExact.length === 0 &&
    older.length === 0 &&
    (!activeSceneNeedsHistory || mandatoryComplete);

  const reasons: string[] = [];
  if (mandatoryComplete) reasons.push('mandatory_sources_complete');
  else reasons.push('mandatory_sources_incomplete');
  if (missingExact.length) reasons.push('explicit_missing_exact_sources');
  if (older.length) reasons.push('older_named_entity_refs_unresolved');
  if (activeSceneNeedsHistory) reasons.push('active_scene_spans_older_history');
  if (creativePreference !== 'off') {
    reasons.push(`creative_preference_${creativePreference}`);
  } else {
    reasons.push('creative_preference_off');
  }
  if (alreadyResolvedByLoadedSource) {
    reasons.push('loaded_source_resolves_need');
  }

  return taskEvidenceNeedSchema.parse({
    version: 'task-evidence-need.v1',
    purpose: input.purpose,
    mandatoryComplete,
    missingExactSourceRefs: missingExact,
    olderNamedEntityRefs: older,
    activeSceneNeedsHistory,
    creativePreference,
    alreadyResolvedByLoadedSource,
    reasons,
  });
}
