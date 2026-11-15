'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminSelfV1, SupportSituationV1 } from '@offscreen/contracts/admin';
import { readAdminCaseSituation } from '@/src/lib/admin-transport';
import { adminQueryKeys } from './admin-query-keys';
import {
  ATTEMPT_COVERAGE_LABEL,
  COMMITMENT_KIND_LABEL,
  COMMITMENT_STATUS_LABEL,
  CONFIDENCE_LABEL,
  DEV_KIND_LABEL,
  GAP_LABEL,
  GEN_CAPTURE_LABEL,
  GEN_PUBLICATION_LABEL,
  GEN_STATE_LABEL,
  NOW_DETAIL,
  NOW_HEADLINE,
  OBSERVATION_LABEL,
  SOURCE_COVERAGE,
  STAGE_COVERAGE_LABEL,
  STAGE_LABEL,
  STAGE_OUTCOME_LABEL,
  WHY_CLASS_LABEL,
  WHY_TEMPLATES,
  buildSafeReferral,
  refLabel,
} from './support-situation-copy';

export const SITUATION_NOT_AUTHORIZED_COPY =
  'Investigation not authorized or not yet linked.';

type FailureKind = 'not-available' | 'session' | 'other';

function classifyFailure(error: unknown): FailureKind {
  const message = error instanceof Error ? error.message : '';
  if (message === 'situation_not_available') return 'not-available';
  if (message === 'staff_session_required') return 'session';
  return 'other';
}

/**
 * OBS07: S1 Support Situation → Why for one assigned, campaign-linked case.
 * Server independently rechecks every gate; this component never accepts a
 * typed campaign id and never renders anything outside the strict DTO.
 */
export function SupportSituationPanel({
  self,
  caseId,
  campaignId,
}: {
  self: AdminSelfV1;
  caseId: string;
  campaignId: string;
}) {
  const queryClient = useQueryClient();
  const queryKey = adminQueryKeys.supportSituation(
    self.staffPrincipalId,
    self.accessEpoch,
    caseId,
    campaignId,
  );
  const situation = useQuery({
    queryKey,
    queryFn: ({ signal }) => readAdminCaseSituation(caseId, campaignId, signal),
    // Pinned view: no focus/reconnect/interval revalidation; Support refreshes
    // explicitly. Protected data is dropped as soon as nobody observes it.
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });

  const failure = situation.isError ? classifyFailure(situation.error) : null;
  const denied = failure === 'not-available' || failure === 'session';

  // A denial after a successful read means access changed: purge, never reuse.
  useEffect(() => {
    if (denied) {
      queryClient.removeQueries({ queryKey });
    }
    // queryKey is rebuilt from primitives each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [denied, queryClient, self.staffPrincipalId, self.accessEpoch, caseId, campaignId]);

  return (
    <section
      aria-labelledby="support-situation-heading"
      aria-busy={situation.isFetching}
    >
      <h3 id="support-situation-heading">Case situation</h3>
      {failure === 'not-available' ? (
        <p role="alert">{SITUATION_NOT_AUTHORIZED_COPY}</p>
      ) : failure === 'session' ? (
        <p role="alert">
          Staff session ended. Re-enter Admin to continue this investigation.
        </p>
      ) : null}
      {situation.isPending && situation.isFetching ? (
        <p role="status">Loading current situation…</p>
      ) : null}
      {failure === 'other' && !situation.data ? (
        <p role="alert">
          Situation unavailable right now. Nothing is shown as current.
        </p>
      ) : null}
      {failure === 'other' && situation.data ? (
        <p role="alert">
          Refresh failed. The read below is earlier and may no longer be
          current.
        </p>
      ) : null}
      {!denied && situation.data ? (
        <SituationBody
          data={situation.data}
          refreshing={situation.isFetching}
          onRefresh={() => {
            void situation.refetch();
          }}
        />
      ) : null}
    </section>
  );
}

function SituationBody({
  data,
  refreshing,
  onRefresh,
}: {
  data: SupportSituationV1;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const { now, activeGeneration: gen, sourceFrontier: frontier } = data;

  async function copyReferral() {
    const text = buildSafeReferral(data);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('Safe source references copied.');
    } catch {
      setCopyStatus('Copy unavailable in this browser. Nothing was sent.');
    }
  }

  return (
    <div>
      <p>
        Pinned read at <time dateTime={data.observedAt}>{data.observedAt}</time>
        . Use Refresh to update; this view does not change on its own.{' '}
        <button type="button" onClick={onRefresh} disabled={refreshing}>
          Refresh
        </button>
      </p>
      {refreshing ? <p role="status">Refreshing…</p> : null}

      <section aria-labelledby="support-now-heading">
        <h4 id="support-now-heading">What’s happening now?</h4>
        <p>
          <strong>{NOW_HEADLINE[now.kind]}</strong>
          {now.held === true ? ' · held' : ''}
        </p>
        {NOW_DETAIL[now.kind] ? <p>{NOW_DETAIL[now.kind]}</p> : null}
        <dl>
          <dt>Source confidence</dt>
          <dd>{CONFIDENCE_LABEL[now.sourceConfidence]}</dd>
          {now.gameSecond !== null ? (
            <>
              <dt>Game second</dt>
              <dd>{now.gameSecond} (committed, not projected due time)</dd>
            </>
          ) : null}
          {now.controllingRef ? (
            <>
              <dt>Controlling source</dt>
              <dd>{refLabel(now.controllingRef)}</dd>
            </>
          ) : null}
          {now.activeCommitment ? (
            <>
              <dt>Active commitment</dt>
              <dd>
                {COMMITMENT_KIND_LABEL[now.activeCommitment.kind]} ·{' '}
                {COMMITMENT_STATUS_LABEL[now.activeCommitment.status]} ·{' '}
                {refLabel(now.activeCommitment.ref)}
              </dd>
            </>
          ) : null}
          <dt>Latest published passage</dt>
          <dd>
            {frontier.latestPublishedPassageId
              ? `#${frontier.latestPublishedPassageSequence ?? '?'} · ${frontier.latestPublishedPassageId} (metadata only)`
              : 'None recorded'}
          </dd>
        </dl>
        {gen ? (
          <dl aria-label="Storyteller generation">
            <dt>Generation</dt>
            <dd>{gen.generationId}</dd>
            <dt>Generation state</dt>
            <dd>{GEN_STATE_LABEL[gen.state]}</dd>
            <dt>Next-scene capture</dt>
            <dd>{GEN_CAPTURE_LABEL[gen.capture]}</dd>
            <dt>Publication</dt>
            <dd>{GEN_PUBLICATION_LABEL[gen.publication]}</dd>
            <dt>Model attempt</dt>
            <dd>{ATTEMPT_COVERAGE_LABEL[gen.attemptCoverage]}</dd>
            {gen.safeFailureCode ? (
              <>
                <dt>Safe failure code</dt>
                <dd>{gen.safeFailureCode}</dd>
              </>
            ) : null}
          </dl>
        ) : null}
      </section>

      <section aria-labelledby="support-why-heading">
        <h4 id="support-why-heading">Why?</h4>
        {data.why.length === 0 ? (
          <p>
            No source-backed explanation is available. This is not evidence
            that nothing happened — escalate with the source references.
          </p>
        ) : (
          <ul>
            {data.why.map((item, index) => (
              <li key={`${item.statementCode}-${index}`}>
                <p>
                  <strong>{WHY_CLASS_LABEL[item.class]}:</strong>{' '}
                  {WHY_TEMPLATES[item.statementCode]}
                </p>
                <details>
                  <summary>Sources and gaps</summary>
                  {item.sourceRefs.length > 0 ? (
                    <ul aria-label="Source references">
                      {item.sourceRefs.map((ref) => (
                        <li key={`${ref.kind}-${ref.id}`}>{refLabel(ref)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No source reference recorded.</p>
                  )}
                  {item.missing.length > 0 ? (
                    <ul aria-label="Evidence gaps">
                      {item.missing.map((gap) => (
                        <li key={gap}>{GAP_LABEL[gap]}</li>
                      ))}
                    </ul>
                  ) : null}
                </details>
              </li>
            ))}
          </ul>
        )}
        {gen ? (
          <details>
            <summary>
              Storyteller stages · {STAGE_COVERAGE_LABEL[gen.stageCoverage]}
            </summary>
            {gen.stages.length > 0 ? (
              <ol aria-label="Storyteller stages">
                {gen.stages.map((stage) => (
                  <li key={stage.ref.id}>
                    {STAGE_LABEL[stage.stage]} ·{' '}
                    {STAGE_OUTCOME_LABEL[stage.outcome]}
                    {stage.safeFailureCode ? ` · ${stage.safeFailureCode}` : ''}{' '}
                    · {refLabel(stage.ref)} ·{' '}
                    <time dateTime={stage.observedAt}>{stage.observedAt}</time>
                  </li>
                ))}
              </ol>
            ) : (
              <p>No stage receipts recorded for this generation.</p>
            )}
          </details>
        ) : null}
      </section>

      <section aria-labelledby="support-recent-heading">
        <h4 id="support-recent-heading">Recent developments</h4>
        {data.recentDevelopments.length === 0 ? (
          <p>
            No recent developments recorded in these sources. This is not
            evidence that nothing happened.
          </p>
        ) : (
          <ul>
            {data.recentDevelopments.map((dev, index) => (
              <li key={`${dev.sourceRef.id}-${index}`}>
                {DEV_KIND_LABEL[dev.kind]} · {OBSERVATION_LABEL[dev.observation]}
                {dev.gameSecond !== null ? ` · game second ${dev.gameSecond}` : ''}
                {dev.eventSequence ? ` · event #${dev.eventSequence}` : ''} ·{' '}
                {refLabel(dev.sourceRef)}
                {dev.observedAt ? (
                  <>
                    {' · '}
                    <time dateTime={dev.observedAt}>{dev.observedAt}</time>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="support-coverage-heading">
        <h4 id="support-coverage-heading">Current coverage</h4>
        <ul>
          <li>{SOURCE_COVERAGE.currentState[data.coverage.currentState]}</li>
          <li>{SOURCE_COVERAGE.gameHistory[data.coverage.gameHistory]}</li>
          <li>
            {SOURCE_COVERAGE.mechanicalHistory[frontier.mechanicalHistoryCoverage]}
          </li>
          <li>
            {SOURCE_COVERAGE.storytellerStages[data.coverage.storytellerStages]}
          </li>
          <li>Private prompt and story text are not included.</li>
        </ul>
      </section>

      <section aria-labelledby="support-escalate-heading">
        <h4 id="support-escalate-heading">Escalate to Engineering</h4>
        <p>
          Copies only the case, campaign, generation, stage and event
          references plus coverage. No story text. Nothing is sent
          automatically.
        </p>
        <button type="button" onClick={() => void copyReferral()}>
          Copy safe source references
        </button>
        {copyStatus ? <p role="status">{copyStatus}</p> : null}
      </section>
    </div>
  );
}
