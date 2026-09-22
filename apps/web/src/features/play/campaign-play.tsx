'use client';
import { useState } from 'react';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import type { CampaignView } from '@offscreen/contracts/campaign';
import type { Pace } from '@offscreen/game/time';
import {
  formatWorldDuration,
  projectWorldTime,
} from '@offscreen/game/calendar';
import { useCampaignCommand } from './use-campaign-command';

export const paceOptions: { label: string; value: string; pace: Pace }[] = [
  {
    label: '1 fictional second per real minute',
    value: 'slow',
    pace: { kind: 'rate', fictionalSeconds: 1, realSeconds: 60 },
  },
  {
    label: '1 fictional second per real second',
    value: 'steady',
    pace: { kind: 'rate', fictionalSeconds: 1, realSeconds: 1 },
  },
  {
    label: '10 fictional seconds per real second',
    value: 'fast',
    pace: { kind: 'rate', fictionalSeconds: 10, realSeconds: 1 },
  },
  {
    label: 'Instant, until a choice or completion',
    value: 'instant',
    pace: { kind: 'instant' },
  },
];

export function CampaignPlay({
  story,
  campaign,
  onSnapshot,
}: {
  story: StorySnapshot;
  campaign: CampaignView;
  onSnapshot: (story: StorySnapshot) => void;
}) {
  const [path, setPath] = useState<string[]>([]);
  const [successorPaths, setSuccessorPaths] = useState<string[][]>([]);
  const [planHorizonTicks, setPlanHorizonTicks] = useState(60);
  const [pace, setPace] = useState('steady');
  const command = useCampaignCommand(story.id, onSnapshot);
  const activity = campaign.activity;
  const actionExecution = campaign.actionExecution;
  const acceptedPlan = campaign.acceptedActivityPlan;
  const nodes = story.resolution ? [] : (campaign.offer?.nodes ?? []);
  const parent = path.at(-1) ?? null;
  const children = nodes.filter((node) => node.parent === parent);
  const active = activity && ['running', 'paused'].includes(activity.state);
  const retainedCommitments = campaign.commitments.filter(
    (commitment) => commitment.id !== activity?.id,
  );
  return (
    <section className="campaign-play" aria-label="Character and activities">
      <div className="campaign-summary">
        <p>
          {campaign.character?.name} · HP {campaign.character?.hp}/
          {campaign.character?.maxHp}
          {campaign.location ? ` · ${campaign.location}` : ''}
        </p>
        <p>World time: {campaign.worldTime.label}</p>
      </div>
      {campaign.holds.length > 0 ? (
        <p role="status">
          {campaign.holds.some(
            (hold) =>
              hold.kind === 'storyteller-intent' || hold.kind === 'storyteller',
          )
            ? 'Campaign time is held while the Storyteller prepares a required scene.'
            : campaign.holds.some((hold) => hold.kind === 'world-obligation')
              ? 'Campaign time is held because a consequential world event requires attention.'
              : 'Campaign time is held while your choice is open.'}{' '}
          Existing activity progress is preserved and held wall time will not
          become catch-up progress.
        </p>
      ) : null}
      {campaign.worldConditions.length ? (
        <section aria-label="Current world conditions">
          <h2>Current world conditions</h2>
          {campaign.worldConditions.map((condition) => (
            <p key={condition.id}>
              <strong>{condition.label}</strong>: {String(condition.value)}
            </p>
          ))}
        </section>
      ) : null}
      {campaign.worldObligations.some(
        (obligation) => obligation.state === 'pending',
      ) ? (
        <details open>
          <summary>Known future events</summary>
          {campaign.worldObligations
            .filter((obligation) => obligation.state === 'pending')
            .map((obligation) => (
              <p key={obligation.id}>
                <strong>{obligation.label}</strong>
                {obligation.visibility === 'exact'
                  ? ` — ${projectWorldTime(campaign.settings.time, obligation.dueTick).label}`
                  : ` — ${obligation.description}`}
              </p>
            ))}
        </details>
      ) : null}
      {campaign.worldObligationEvents.length ? (
        <details>
          <summary>World event history</summary>
          {campaign.worldObligationEvents.map((event) => (
            <p key={event.id}>
              <strong>{event.label}</strong> · {event.kind} ·{' '}
              {projectWorldTime(campaign.settings.time, event.tick).label}
            </p>
          ))}
        </details>
      ) : null}
      {actionExecution ? (
        <div role="status">
          <p>
            <strong>{actionExecution.label}</strong> is {actionExecution.state}{' '}
            for{' '}
            {formatWorldDuration(
              campaign.settings.time,
              actionExecution.targetTick - actionExecution.startTick,
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
                    pace: paceOptions.find((option) => option.value === pace)
                      ?.pace,
                  })
                }
              >
                Apply speed
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      <details>
        <summary>Character state and rules</summary>
        {/* These values are invaluable when checking deterministic authority,
            but raw fact identifiers make the primary scene read like a debug
            console. Keep them available without placing them in the player's
            path from fiction to choice. */}
        {campaign.character?.quantities.map((quantity) => (
          <p key={quantity.id}>
            {quantity.label}: {quantity.value}
          </p>
        ))}
        {campaign.character?.facts.map((fact) => (
          <p key={fact.id}>
            {fact.id}: {String(fact.value)}
          </p>
        ))}
        {campaign.storyFacts.map((fact) => (
          <p key={fact.id}>
            Story fact · {fact.id}: {String(fact.value)}
          </p>
        ))}
        <p>
          Elapsed game time:{' '}
          {formatWorldDuration(campaign.settings.time, campaign.tick)}. SRD
          5.2.1 ability-check subset; server-resolved nonlethal actions.
        </p>
      </details>
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
                        pace: paceOptions.find(
                          (option) => option.value === pace,
                        )?.pace,
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
      {retainedCommitments.length ? (
        <details open>
          <summary>Work you can return to</summary>
          {/* Retained commitments are story promises, not generic background
              jobs. Keep their identity and earned progress legible without
              turning the scene into a project-management dashboard. */}
          {retainedCommitments.map((commitment) => (
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
            Accepted at tick {acceptedPlan.acceptedAtTick}; no successor starts
            at or after tick {acceptedPlan.horizonTick}.
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
      {campaign.activityEvents.length ? (
        <details>
          <summary>Activity history (latest 100)</summary>
          {/* This is durable player-safe history, not a reconstruction from
              the current commitment or transient worker logs. */}
          {campaign.activityEvents.map((event) => (
            <article key={event.id}>
              <p>
                <strong>{event.label}</strong> · {event.kind} · tick{' '}
                {event.tick}
              </p>
              <p>{event.summary}</p>
            </article>
          ))}
        </details>
      ) : null}
      {campaign.actionExecutionEvents.length ? (
        <details>
          <summary>Timed action history (latest 100)</summary>
          {campaign.actionExecutionEvents.map((event) => (
            <p key={event.id}>
              <strong>{event.label}</strong> · {event.kind} · tick {event.tick}
            </p>
          ))}
        </details>
      ) : null}
      {campaign.activityReports.length ? (
        <details open>
          <summary>Reports from earlier activity</summary>
          {campaign.activityReports.map((entry) => (
            <article key={entry.id}>
              <p>
                <strong>{entry.report?.title ?? entry.label}</strong> · tick{' '}
                {entry.sourceTick} · {entry.state}
              </p>
              {(entry.report?.paragraphs ?? [entry.factualSummary]).map(
                (paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ),
              )}
            </article>
          ))}
        </details>
      ) : null}
      {campaign.worldObligationReports.length ? (
        <details open>
          <summary>Reports from world events</summary>
          {campaign.worldObligationReports.map((entry) => (
            <article key={entry.id}>
              <p>
                <strong>{entry.report?.title ?? entry.label}</strong> · tick{' '}
                {entry.sourceTick} · {entry.state}
              </p>
              {(entry.report?.paragraphs ?? [entry.factualSummary]).map(
                (paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ),
              )}
            </article>
          ))}
        </details>
      ) : null}
      {nodes.length ? (
        <div
          className="scene-choices campaign-decisions"
          aria-label="Contextual options"
        >
          <h2>What would you like to do?</h2>
          {path.length ? (
            <button
              disabled={command.busy}
              onClick={() => setPath((prior) => prior.slice(0, -1))}
            >
              Back
            </button>
          ) : null}
          {children.map((node) => (
            <article className="campaign-option" key={node.id}>
              <button
                disabled={
                  command.busy ||
                  command.retry ||
                  (Boolean(node.action) &&
                    successorPaths.some(
                      (candidate) =>
                        candidate.join('/') === [...path, node.id].join('/'),
                    ))
                }
                onClick={() => {
                  if (!node.action) {
                    setPath([...path, node.id]);
                    return;
                  }
                  void command.send('actions', {
                    expectedRevision: story.revision,
                    offerId: campaign.offer?.id,
                    path: [...path, node.id],
                    ...(successorPaths.length
                      ? {
                          successorPaths,
                          horizonTicks: planHorizonTicks,
                        }
                      : {}),
                  });
                  setPath([]);
                  setSuccessorPaths([]);
                }}
              >
                {node.label}
              </button>
              <p className="campaign-option-intention">{node.description}</p>
              {node.action ? (
                <p>
                  Time:{' '}
                  {node.action.timing.kind === 'process'
                    ? 'extended'
                    : formatWorldDuration(
                        campaign.settings.time,
                        node.action.timing.fictionalSeconds,
                      )}
                  .
                </p>
              ) : null}
              {node.risk ? (
                <p className="campaign-option-risk">
                  <strong>Apparent risk:</strong> {node.risk}
                </p>
              ) : null}
              {node.action ? (
                <button
                  disabled={
                    command.busy ||
                    successorPaths.length >= 5 ||
                    successorPaths.some(
                      (candidate) =>
                        candidate.join('/') === [...path, node.id].join('/'),
                    )
                  }
                  onClick={() =>
                    setSuccessorPaths((prior) => [...prior, [...path, node.id]])
                  }
                >
                  Add as a later activity
                </button>
              ) : null}
            </article>
          ))}
          {successorPaths.length ? (
            <div>
              <p>
                {successorPaths.length} later{' '}
                {successorPaths.length === 1 ? 'activity' : 'activities'}{' '}
                staged. Choose a different activity to start the plan.
              </p>
              <label>
                Successor horizon in game ticks{' '}
                <input
                  type="number"
                  min={1}
                  max={10080}
                  value={planHorizonTicks}
                  onChange={(event) =>
                    setPlanHorizonTicks(Number(event.target.value))
                  }
                />
              </label>{' '}
              <button
                onClick={() => setSuccessorPaths((prior) => prior.slice(0, -1))}
              >
                Remove last
              </button>{' '}
              <button onClick={() => setSuccessorPaths([])}>Clear</button>
            </div>
          ) : null}
        </div>
      ) : null}
      {!story.resolution && !active && !nodes.length ? (
        <p>
          The story is held: the current plan produced no supported action for
          these circumstances. Your character's life has not ended.
        </p>
      ) : null}
      {command.message ? <p role="status">{command.message}</p> : null}
      {command.retry ? (
        <button disabled={command.busy} onClick={() => void command.send()}>
          Retry the same request
        </button>
      ) : null}
      {campaign.actionReceipts.length ? (
        <details>
          <summary>Committed immediate outcomes</summary>
          {campaign.actionReceipts.map((receipt) => (
            <article key={receipt.id}>
              <p>
                <strong>{receipt.label}</strong> · {receipt.outcome} ·{' '}
                {receipt.state}
              </p>
              <p>{receipt.text}</p>
              {receipt.state === 'pending' ? (
                <p role="status">
                  The outcome is committed. Storyteller preparation has not
                  produced a generation yet, so time remains held and retrying
                  preparation cannot repeat the action, roll, or effects.
                </p>
              ) : null}
              {receipt.declarations.map((declaration) => (
                <p key={declaration.fact.id}>
                  Established {declaration.fact.id}:{' '}
                  {String(declaration.fact.value)}
                </p>
              ))}
              {receipt.roll ? (
                <p>
                  d20: {receipt.roll.dice.join(', ')} → {receipt.roll.chosen} ={' '}
                  {receipt.roll.total}; DC {receipt.roll.dc}:{' '}
                  {receipt.roll.success ? 'success' : 'failure'}.
                </p>
              ) : (
                <p>No roll was required.</p>
              )}
            </article>
          ))}
        </details>
      ) : null}
      <details>
        <summary>Character abilities</summary>
        <dl>
          {Object.entries(campaign.character?.scores ?? {}).map(
            ([ability, score]) => (
              <div key={ability}>
                <dt>{ability}</dt>
                <dd>
                  {score} ({Math.floor((score - 10) / 2) >= 0 ? '+' : ''}
                  {Math.floor((score - 10) / 2)})
                </dd>
              </div>
            ),
          )}
        </dl>
        <p>
          Proficient: {campaign.character?.proficientSkills.join(', ')}.
          Proficiency bonus +{campaign.character?.proficiencyBonus}.
        </p>
      </details>
      <details open={campaign.rolls.length > 0}>
        <summary>Saved dice and outcomes (latest 100)</summary>
        {campaign.rolls.map((entry) => (
          <article key={entry.id}>
            <p>
              <strong>{entry.roll.purpose}</strong> · tick {entry.tick} ·
              boundary {entry.segment}
            </p>
            <p>
              d20: {entry.roll.dice.join(', ')} → {entry.roll.chosen}
              {entry.roll.modifiers
                .map(
                  (modifier) =>
                    ` ${modifier.value >= 0 ? '+' : ''}${modifier.value} ${modifier.source}`,
                )
                .join('')}{' '}
              = {entry.roll.total};{' '}
              {entry.roll.kind === 'event'
                ? `event threshold ≤ ${entry.roll.dc}: ${entry.roll.success ? 'occurred' : 'quiet'}`
                : `DC ${entry.roll.dc}: ${entry.roll.success ? 'success' : 'failure'}`}
              .{' '}
              {entry.effects
                .map((effect) =>
                  effect.kind === 'fact.set.v1'
                    ? `${effect.fact.id}: ${effect.fact.value}`
                    : `${campaign.character?.quantities.find((quantity) => quantity.id === effect.quantityId)?.label ?? effect.quantityId}: ${effect.delta >= 0 ? '+' : ''}${effect.delta}`,
                )
                .join(', ')}
            </p>
          </article>
        ))}
      </details>
      <p className="field-help">
        Dice are rolled and saved by the server. Reloading and narration cannot
        reroll them. <a href="/rules">Rules and attribution</a>
      </p>
    </section>
  );
}
