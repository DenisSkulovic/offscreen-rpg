import { useState } from 'react';
import type { CampaignView } from '@offscreen/contracts/campaign';
import { formatWorldDuration } from '@offscreen/game/calendar';
import type { CampaignCommandApi } from '../api/campaign-command';
import {
  isActivityActive,
  retainedCommitments,
} from '../model/campaign-projections';
import { paceForValue, paceOptions } from '../model/pace-options';

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
    <>
      {actionExecution ? (
        <div role="status">
          <p>
            <strong>{actionExecution.label}</strong> is {actionExecution.state}{' '}
            for{' '}
            {formatWorldDuration(
              campaign.settings.time,
              actionExecution.targetGameSecond -
                actionExecution.startGameSecond,
            )}
            .
            {actionExecution.dueAt
              ? ` Expected around ${new Date(actionExecution.dueAt).toLocaleTimeString()}.`
              : ' Campaign time is currently held.'}{' '}
            The outcome, roll and effects are not committed before that
            boundary.
          </p>
          <button
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
        </div>
      ) : null}
      {activity ? (
        <div>
          <h2>{activity.label}</h2>
          <p>
            {activity.progress.label}:{' '}
            {activity.progress.kind === 'contribution'
              ? `${activity.progress.earned}/${activity.progress.required}`
              : `${formatWorldDuration(campaign.settings.time, activity.progress.elapsedFictionalSeconds)} / ${formatWorldDuration(campaign.settings.time, activity.progress.requiredFictionalSeconds)}`}{' '}
            · {activity.state}. {activity.boundariesSettled} mechanical
            boundaries settled.
          </p>
          {activity.dueAt ? (
            <p>
              Next clock update around{' '}
              {new Date(activity.dueAt).toLocaleTimeString()}. It can finish
              while you are away.
            </p>
          ) : null}
          {activity.estimatedCompletionAt ? (
            <p>
              Conditional completion estimate:{' '}
              {new Date(activity.estimatedCompletionAt).toLocaleTimeString()}.
              Future rolls, tools and interruptions can change it.
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
                disabled={command.busy || command.retry}
                onClick={() =>
                  void command.send('activity-controls', {
                    activityId: activity.id,
                    expectedRevision: activity.revision,
                    action: activity.state === 'paused' ? 'resume' : 'pause',
                  })
                }
              >
                {activity.state === 'paused' ? 'Resume' : 'Pause'}
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
                    rolls stay unchanged.
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
        </div>
      ) : null}
      {commitments.length ? (
        <details open>
          <summary>Work you can return to</summary>
          {commitments.map((commitment) => (
            <article key={commitment.id}>
              <p>
                <strong>{commitment.label}</strong> · {commitment.state}
              </p>
              <p>
                {commitment.progress.label}:{' '}
                {commitment.progress.kind === 'contribution'
                  ? `${commitment.progress.earned}/${commitment.progress.required}`
                  : `${formatWorldDuration(campaign.settings.time, commitment.progress.elapsedFictionalSeconds)} / ${formatWorldDuration(campaign.settings.time, commitment.progress.requiredFictionalSeconds)}`}
                . Time is not advancing this work.
              </p>
            </article>
          ))}
        </details>
      ) : null}
      {acceptedPlan ? (
        <details open>
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
    </>
  );
}
