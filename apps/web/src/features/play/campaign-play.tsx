'use client';
import { useState } from 'react';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import type { CampaignView } from '@offscreen/contracts/campaign';
import type { Pace } from '@offscreen/game/time';
import { useCampaignCommand } from './use-campaign-command';

export const paceOptions: { label: string; value: string; pace: Pace }[] = [
  {
    label: '1 tick per real minute',
    value: 'slow',
    pace: { kind: 'rate', ticks: 1, realMs: 60000 },
  },
  {
    label: '1 tick per real second',
    value: 'steady',
    pace: { kind: 'rate', ticks: 1, realMs: 1000 },
  },
  {
    label: '10 ticks per real second',
    value: 'fast',
    pace: { kind: 'rate', ticks: 10, realMs: 1000 },
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
  const [pace, setPace] = useState('steady');
  const command = useCampaignCommand(story.id, onSnapshot);
  const activity = campaign.activity;
  const nodes = story.resolution ? [] : (campaign.offer?.nodes ?? []);
  const parent = path.at(-1) ?? null;
  const children = nodes.filter((node) => node.parent === parent);
  const active = activity && ['running', 'paused'].includes(activity.state);
  return (
    <section aria-label="Character and activities">
      <p>
        {campaign.character?.name} · HP {campaign.character?.hp}/
        {campaign.character?.maxHp} · {campaign.location}
      </p>
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
      <p>
        Tick {campaign.tick}. SRD 5.2.1 ability-check subset; authored nonlethal
        activities.
      </p>
      {activity ? (
        <div>
          <h2>{activity.label}</h2>
          <p>
            {activity.resolvedTicks}/{activity.durationTicks} ticks resolved ·{' '}
            {activity.state}.
          </p>
          {activity.dueAt ? (
            <p>
              Next clock update around{' '}
              {new Date(activity.dueAt).toLocaleTimeString()}. It can finish
              while you are away.
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
      {nodes.length ? (
        <div aria-label="Contextual options">
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
            <div key={node.id}>
              <button
                disabled={command.busy || command.retry}
                onClick={() => {
                  if (!node.action) {
                    setPath([...path, node.id]);
                    return;
                  }
                  void command.send('actions', {
                    expectedRevision: story.revision,
                    offerId: campaign.offer?.id,
                    path: [...path, node.id],
                  });
                  setPath([]);
                }}
              >
                {node.label}
              </button>
              <p className="field-help">{node.description}</p>
            </div>
          ))}
        </div>
      ) : null}
      {!story.resolution && !active && !nodes.length ? (
        <p>
          The story is held: this authored content has no supported action for
          the current circumstances. Your character's life has not ended.
        </p>
      ) : null}
      {command.message ? <p role="status">{command.message}</p> : null}
      {command.retry ? (
        <button disabled={command.busy} onClick={() => void command.send()}>
          Retry the same request
        </button>
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
