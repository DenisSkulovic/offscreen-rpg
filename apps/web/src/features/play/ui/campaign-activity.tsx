import { useState } from 'react';
import type { CampaignView } from '@offscreen/contracts/campaign';
import { formatWorldDuration } from '@offscreen/game/calendar';
import type { CampaignCommandApi } from '../api/campaign-command';
import {
  activityConditionLabel,
  isActivityActive,
  retainedCommitments,
} from '../model/campaign-projections';
import { paceForValue, paceOptions } from '../model/pace-options';

function progressText(
  campaign: CampaignView,
  progress: NonNullable<CampaignView['activity']>['progress'],
) {
  if (progress.kind === 'contribution') {
    return `${progress.label}: ${progress.earned}/${progress.required} earned`;
  }
  return `${progress.label}: ${formatWorldDuration(
    campaign.settings.time,
    progress.elapsedFictionalSeconds,
  )} of ${formatWorldDuration(
    campaign.settings.time,
    progress.requiredFictionalSeconds,
  )}`;
}

export function CampaignActivityPanel({
  campaign,
  command,
}: {
  campaign: CampaignView;
  command: CampaignCommandApi;
}) {
  const [pace, setPace] = useState('steady');
  const activity = campaign.activity;
  const actionExecution = campaign.actionExecution;
  const acceptedPlan = campaign.acceptedActivityPlan;
  const active = isActivityActive(activity);
  const commitments = retainedCommitments(campaign);

  return (
    <div className="story-frame__commitment">
      {actionExecution ? (
        <section
          className="story-frame__notice"
          aria-label="Accepted action in progress"
          role="status"
        >
          <p>
            <strong>{actionExecution.label}</strong> is{' '}
            {actionExecution.state === 'paused' ? 'paused' : 'underway'} for{' '}
            {formatWorldDuration(
              campaign.settings.time,
              actionExecution.targetGameSecond -
                actionExecution.startGameSecond,
            )}
            .
            {actionExecution.dueAt
              ? ` Expected around ${new Date(actionExecution.dueAt).toLocaleTimeString()}.`
              : ' Campaign time is currently held.'}{' '}
            Outcome, roll, and effects are not committed before that boundary.
          </p>
          <button
            type="button"
            className="story-frame__intention story-frame__intention--commit"
            disabled={command.busy || command.retry}
            onClick={() =>
              void command.send('action-execution-controls', {
                executionId: actionExecution.operationId,
                expectedRevision: actionExecution.revision,
                action: actionExecution.state === 'paused' ? 'resume' : 'pause',
              })
            }
          >
            {actionExecution.state === 'paused' ? 'Resume' : 'Pause'}
          </button>
          {!campaign.settings.locked ? (
            <>
              <label>
                Speed for this action{' '}
                <select
                  value={pace}
                  onChange={(event) => setPace(event.target.value)}
                >
                  {paceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="story-frame__intention story-frame__intention--explore"
                disabled={command.busy || command.retry}
                onClick={() =>
                  void command.send('action-execution-controls', {
                    executionId: actionExecution.operationId,
                    expectedRevision: actionExecution.revision,
                    action: 'pace',
                    pace: paceForValue(pace),
                  })
                }
              >
                Apply speed
              </button>
            </>
          ) : null}
        </section>
      ) : null}

      {activity ? (
        <section
          className={
            activity.state === 'paused' ||
            activity.state === 'suspended' ||
            activity.state === 'blocked' ||
            activity.completionPending
              ? 'story-frame__notice story-frame__notice--held'
              : 'story-frame__notice'
          }
          aria-label="Current commitment"
        >
          <h2 className="story-frame__threshold-heading">
            {activity.label}
          </h2>
          <p className="story-frame__stage-status">
            {activityConditionLabel(activity)}
          </p>
          <p>{progressText(campaign, activity.progress)}</p>
          {activity.boundariesSettled > 0 ? (
            <p>
              {activity.boundariesSettled} mechanical{' '}
              {activity.boundariesSettled === 1 ? 'boundary' : 'boundaries'}{' '}
              already settled. Settled progress does not rewind.
            </p>
          ) : null}
          {activity.dueAt && !activity.completionPending ? (
            <p>
              Next clock update around{' '}
              {new Date(activity.dueAt).toLocaleTimeString()}. It can finish
              while you are away.
            </p>
          ) : null}
          {activity.completionPending ? (
            <p>
              The local clock may already read zero; settlement is still
              pending. This is not a completed reward.
            </p>
          ) : null}
          {activity.estimatedCompletionAt && !activity.completionPending ? (
            <p>
              Conditional completion estimate:{' '}
              {new Date(activity.estimatedCompletionAt).toLocaleTimeString()}.
              Future rolls, tools, and interruptions can change it.
            </p>
          ) : null}
          {active &&
          activity.settingsRevision !== campaign.settings.revision ? (
            <p>
              This activity retains its admitted checks and effects. Newly
              prepared narration uses your current storyteller settings.
            </p>
          ) : null}
          {active ? (
            <>
              <button
                type="button"
                className="story-frame__intention story-frame__intention--commit"
                disabled={command.busy || command.retry}
                onClick={() =>
                  void command.send('activity-controls', {
                    activityId: activity.id,
                    expectedRevision: activity.revision,
                    action: activity.state === 'paused' ? 'resume' : 'pause',
                  })
                }
              >
                {activity.state === 'paused' ? 'Resume work' : 'Pause work'}
              </button>
              {!campaign.settings.locked ? (
                <div>
                  <label>
                    Speed for this activity and future activities{' '}
                    <select
                      value={pace}
                      onChange={(event) => setPace(event.target.value)}
                    >
                      {paceOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="story-frame__intention story-frame__intention--explore"
                    disabled={command.busy || command.retry}
                    onClick={() =>
                      void command.send('activity-controls', {
                        activityId: activity.id,
                        expectedRevision: activity.revision,
                        action: 'pace',
                        pace: paceForValue(pace),
                      })
                    }
                  >
                    Apply speed to remaining time
                  </button>
                  <p>
                    Already elapsed time is settled at the old speed. Completed
                    rolls stay unchanged. Pace never invents earned progress.
                  </p>
                </div>
              ) : (
                <p>
                  Speed settings are locked. Pause and resume are still
                  available.
                </p>
              )}
            </>
          ) : null}
        </section>
      ) : null}

      {!activity && !actionExecution ? (
        <p className="story-frame__intention-support">
          No active commitment. Fictional time is not advancing on its own.
        </p>
      ) : null}

      {commitments.length ? (
        <details className="story-frame__secondary" open>
          <summary>Work you can return to</summary>
          {commitments.map((commitment) => (
            <article key={commitment.id}>
              <p>
                <strong>{commitment.label}</strong> ·{' '}
                {activityConditionLabel(commitment)}
              </p>
              <p>
                {progressText(campaign, commitment.progress)}. Time is not
                advancing this work.
              </p>
            </article>
          ))}
        </details>
      ) : null}

      {acceptedPlan ? (
        <details className="story-frame__secondary" open>
          <summary>Accepted activity plan</summary>
          <p>
            {acceptedPlan.state}
            {acceptedPlan.blockedReason
              ? ` — ${acceptedPlan.blockedReason}`
              : ''}
          </p>
          <p>
            Accepted at fictional second {acceptedPlan.acceptedAtGameSecond}; no
            successor starts at or after fictional second{' '}
            {acceptedPlan.horizonGameSecond}.
          </p>
          <ol>
            {acceptedPlan.entries.map((entry) => (
              <li key={entry.id}>
                {entry.label} · {entry.state}
              </li>
            ))}
          </ol>
          {['active', 'blocked'].includes(acceptedPlan.state) ? (
            <button
              type="button"
              className="story-frame__intention story-frame__intention--explore"
              disabled={command.busy || command.retry}
              onClick={() =>
                void command.send('accepted-plan-controls', {
                  planId: acceptedPlan.id,
                  expectedRevision: acceptedPlan.revision,
                  action: 'cancel-pending',
                })
              }
            >
              Cancel pending activities
            </button>
          ) : null}
        </details>
      ) : null}
    </div>
  );
}
