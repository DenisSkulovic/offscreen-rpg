import type {
  SupportEvidenceGap,
  SupportReasonCode,
  SupportSafeRefV1,
  SupportSituationV1,
} from '@offscreen/admin-interface/admin';

/**
 * OBS07 reviewed deterministic Support copy. Every sentence is keyed by a
 * closed S1 enum — no LLM, no player prose, no free text from the response.
 * A missing key is a compile error (Record over the closed unions).
 */

type Now = SupportSituationV1['now'];
type Gen = NonNullable<SupportSituationV1['activeGeneration']>;
type Dev = SupportSituationV1['recentDevelopments'][number];
type Stage = Gen['stages'][number];

export const WHY_TEMPLATES: Record<SupportReasonCode, string> = {
  action_interrupted:
    'The player’s action was interrupted. A source event records the interruption; this does not show that any transfer, reward or settlement succeeded.',
  action_settlement_recorded:
    'A settlement receipt is recorded for the action. Exact amounts and rewards are not shown on this screen.',
  context_materialization_held:
    'Preparing the next scene was held while its context was being assembled. This is not a model timeout: no model call is implied.',
  scripted_provider_skipped:
    'A recorded stage shows the model call was skipped on a scripted path. This does not state any charge amount.',
  validation_failed:
    'The generated output failed validation (recorded safe failure code). Nothing is implied about why.',
  publication_stale:
    'The output exists, but its publication is recorded as stale. It did not become a new published scene.',
  published_passage:
    'A scene passage was published from this generation (metadata only).',
  model_attempt_unverified:
    'No model attempt is recorded in the reviewed sources. This is a coverage statement, not proof that no provider was contacted and not proof of zero charge.',
  source_data_unavailable:
    'Source data for this part is unavailable or not instrumented. This is not evidence that nothing happened.',
};

export const WHY_CLASS_LABEL: Record<
  SupportSituationV1['why'][number]['class'],
  string
> = {
  recorded: 'Recorded',
  derived: 'Derived',
  unknown: 'Unknown',
};

export const GAP_LABEL: Record<SupportEvidenceGap, string> = {
  'attempt-not-recorded': 'No model attempt recorded',
  'stage-not-instrumented': 'Stage receipts not instrumented',
  'mechanical-history-not-instrumented': 'Game history not instrumented',
  'source-missing': 'Source missing',
  'source-conflict': 'Sources conflict',
};

export const NOW_HEADLINE: Record<Now['kind'], string> = {
  'decision-hold': 'Waiting for the player’s decision',
  'narration-intent': 'Narration intent pending',
  'storyteller-generation': 'Narration preparation in progress or held',
  'world-obligation': 'A world obligation controls the next step',
  'finite-action': 'A finite action is running',
  activity: 'An activity is running',
  idle: 'Idle — no hold or active operation recorded',
  'narrative-only': 'Narrative-only story (no mechanical campaign state)',
  'conflicting-sources': 'Sources conflict — escalate, do not guess',
  unknown: 'Current state unknown',
};

export const NOW_DETAIL: Partial<Record<Now['kind'], string>> = {
  'narration-intent':
    'A narration request exists but no generation has been captured yet. No model round is claimed.',
  'narrative-only':
    'Mechanical telemetry is not supported for this story. That is not a fault.',
  idle: 'Not proof that no background task is queued.',
  'conflicting-sources':
    'More than one source claims control, or a source is invalid.',
};

export const CONFIDENCE_LABEL: Record<Now['sourceConfidence'], string> = {
  'direct-current-source': 'Direct current source',
  partial: 'Partial source',
  unknown: 'Unknown source',
};

export const COMMITMENT_STATUS_LABEL: Record<
  NonNullable<Now['activeCommitment']>['status'],
  string
> = {
  running: 'Running',
  paused: 'Paused',
  interrupted: 'Interrupted',
  settled: 'Settled',
  encounter: 'Encounter',
  complete: 'Complete',
  blocked: 'Blocked',
  cancelled: 'Cancelled',
  'horizon-reached': 'Horizon reached',
  unknown: 'Unknown',
};

export const COMMITMENT_KIND_LABEL: Record<
  NonNullable<Now['activeCommitment']>['kind'],
  string
> = { 'finite-action': 'Finite action', activity: 'Activity' };

export const GEN_STATE_LABEL: Record<Gen['state'], string> = {
  pending: 'Pending',
  running: 'Running',
  succeeded: 'Succeeded',
  failed: 'Failed',
  uncertain: 'Uncertain',
  unknown: 'Unknown',
};

export const GEN_CAPTURE_LABEL: Record<Gen['capture'], string> = {
  captured: 'Captured',
  materializing: 'Materializing',
  ready: 'Ready',
  held: 'Held',
  blocked: 'Blocked',
  stale: 'Stale',
  'not-recorded': 'Not recorded',
  unknown: 'Unknown',
};

export const GEN_PUBLICATION_LABEL: Record<Gen['publication'], string> = {
  pending: 'Not published yet',
  published: 'Published',
  stale: 'Stale — not published as a new scene',
  blocked: 'Blocked',
  unknown: 'Unknown',
};

export const ATTEMPT_COVERAGE_LABEL: Record<Gen['attemptCoverage'], string> = {
  recorded: 'Model attempt recorded',
  'none-recorded':
    'No model attempt recorded (coverage statement — not proof no provider was contacted, not proof of zero charge)',
  unknown: 'Model attempt coverage unknown',
};

export const STAGE_COVERAGE_LABEL: Record<Gen['stageCoverage'], string> = {
  recorded: 'Stage receipts recorded',
  'not-instrumented': 'Not instrumented (legacy or pre-OBS02)',
  'not-applicable': 'Not applicable',
  partial: 'Partial stage receipts',
};

export const STAGE_LABEL: Record<Stage['stage'], string> = {
  'cause-captured': 'Cause captured',
  'context-materialization-started': 'Context materialization started',
  'context-materialization-completed': 'Context materialization completed',
  'task-prepared': 'Task prepared',
  'dispatch-review-prepared': 'Dispatch review prepared',
  'provider-dispatch-possible': 'Provider dispatch possible',
  'model-response-recorded': 'Model response recorded',
  'validation-settled': 'Validation settled',
  'publication-decided': 'Publication decided',
  'stage-held': 'Stage held',
  'stage-skipped': 'Stage skipped',
  'stage-failed': 'Stage failed',
};

export const STAGE_OUTCOME_LABEL: Record<Stage['outcome'], string> = {
  completed: 'Completed',
  failed: 'Failed',
  held: 'Held',
  stale: 'Stale',
  uncertain: 'Uncertain',
  'not-run': 'Not run',
};

export const DEV_KIND_LABEL: Record<Dev['kind'], string> = {
  'passage-published': 'Scene published',
  'action-settled': 'Action settled',
  'action-interrupted': 'Accepted action interrupted',
  'activity-development': 'Activity advanced',
  'world-development': 'World development',
};

export const OBSERVATION_LABEL: Record<Dev['observation'], string> = {
  recorded: 'Recorded',
  derived: 'Derived',
};

export const REF_KIND_LABEL: Record<SupportSafeRefV1['kind'], string> = {
  story: 'Story',
  'story-passage': 'Passage',
  campaign: 'Campaign',
  generation: 'Generation',
  'storyteller-operation': 'Operation',
  'storyteller-stage': 'Stage',
  'decision-offer': 'Decision offer',
  'world-obligation': 'World obligation',
  'action-execution': 'Action execution',
  'action-execution-event': 'Action event',
  activity: 'Activity',
  'activity-event': 'Activity event',
};

export const SOURCE_COVERAGE = {
  currentState: {
    verified: 'Verified current state',
    partial: 'Partial current state',
    unavailable: 'Current state unavailable',
  },
  gameHistory: {
    'since-enabled': 'Game history recorded since instrumentation was enabled',
    partial: 'Game history partial',
    'not-instrumented': 'Game history not instrumented',
  },
  storytellerStages: {
    recorded: 'Storyteller stages recorded',
    partial: 'Storyteller stages partial',
    'not-instrumented': 'Storyteller stages not instrumented',
    'not-applicable': 'Storyteller stages not applicable',
  },
  mechanicalHistory: {
    'not-instrumented': 'Mechanical history not instrumented',
    partial: 'Mechanical history partial',
    unknown: 'Mechanical history unknown',
  },
} as const;

export function refLabel(ref: SupportSafeRefV1): string {
  return `${REF_KIND_LABEL[ref.kind]} ${ref.id}`;
}

/**
 * Allowlisted escalation text. Built ONLY from the strictly parsed S1 DTO:
 * UUIDs, closed enum codes, integers and ISO timestamps. No titles, prose,
 * tokens, hashes or raw JSON are ever read, so none can be copied.
 */
export function buildSafeReferral(situation: SupportSituationV1): string {
  const lines: string[] = [
    'Offscreen Support referral (S1 metadata only)',
    `case: ${situation.caseId}`,
    `campaign: ${situation.campaignId}`,
    `observedAt: ${situation.observedAt}`,
    `now: ${situation.now.kind} (${situation.now.sourceConfidence})` +
      (situation.now.controllingRef
        ? ` controlling ${situation.now.controllingRef.kind}:${situation.now.controllingRef.id}`
        : ''),
  ];
  if (situation.now.gameSecond !== null) {
    lines.push(`gameSecond: ${situation.now.gameSecond}`);
  }
  const commitment = situation.now.activeCommitment;
  if (commitment) {
    lines.push(
      `commitment: ${commitment.kind} ${commitment.status} ${commitment.ref.kind}:${commitment.ref.id}`,
    );
  }
  const f = situation.sourceFrontier;
  if (f.latestPublishedPassageId) {
    lines.push(
      `latestPublishedPassage: ${f.latestPublishedPassageId}` +
        (f.latestPublishedPassageSequence !== null
          ? ` #${f.latestPublishedPassageSequence}`
          : ''),
    );
  }
  const g = situation.activeGeneration;
  if (g) {
    lines.push(
      `generation: ${g.generationId} state=${g.state} capture=${g.capture} publication=${g.publication} attempt=${g.attemptCoverage} stages=${g.stageCoverage}` +
        (g.safeFailureCode ? ` failure=${g.safeFailureCode}` : ''),
    );
    for (const s of g.stages) {
      lines.push(
        `stage: ${s.ref.id} ${s.stage} ${s.outcome} ${s.observedAt}`,
      );
    }
  }
  for (const w of situation.why) {
    const refs = w.sourceRefs.map((r) => `${r.kind}:${r.id}`).join(',');
    const gaps = w.missing.join(',');
    lines.push(
      `why: ${w.statementCode} (${w.class})` +
        (refs ? ` refs=${refs}` : '') +
        (gaps ? ` gaps=${gaps}` : ''),
    );
  }
  for (const d of situation.recentDevelopments) {
    lines.push(
      `development: ${d.kind} ${d.sourceRef.kind}:${d.sourceRef.id}` +
        (d.eventSequence ? ` seq=${d.eventSequence}` : ''),
    );
  }
  const c = situation.coverage;
  lines.push(
    `coverage: current=${c.currentState} history=${c.gameHistory} stages=${c.storytellerStages} promptBody=${c.promptBody} mechanical=${f.mechanicalHistoryCoverage}`,
  );
  return lines.join('\n');
}
