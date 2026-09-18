'use client';

import {
  listChamberScenarios,
  type ChamberInspector,
} from '@offscreen/contracts/chamber';
import type { StorySnapshot } from '@offscreen/contracts/stories';
import { StoryHistoryView } from './history';
import { ChamberInspectorPanel } from './inspector';

function journeyAction(waiting: NonNullable<StorySnapshot['waiting']>) {
  if (waiting.remainingMs === null) {
    return 'pause' as const;
  }
  return 'resume' as const;
}

function defaultDecisionLabel(story: StorySnapshot) {
  const decision = story.decision;
  if (!decision || !story.current.interaction) {
    return undefined;
  }
  return story.current.interaction.specification.options.find(
    (option) => option.id === decision.defaultOptionId,
  )?.label;
}

export function ChamberScene(args: {
  story: StorySnapshot;
  pending: boolean;
  controlPending: boolean;
  responsePending: boolean;
  inspector: ChamberInspector | null;
  inspectorError: string;
  inspectorPending: boolean;
  onInspect: () => void;
  onControl: (action?: 'pause' | 'resume') => void;
  onRespond: (optionId?: string) => void;
}) {
  const { story, pending } = args;
  const waiting = story.waiting;
  const defaultLabel = defaultDecisionLabel(story);
  return (
    <>
      <h1>{story.current.content.title}</h1>
      {story.current.content.paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
      {waiting ? (
        <section aria-label="Journey timing">
          {waiting.remainingMs !== null ? (
            <p>
              Journey paused. {Math.ceil(waiting.remainingMs / 1000)} real
              seconds remain.
            </p>
          ) : (
            <p>
              Arrival estimated at {waiting.dueAt}. Processing may be delayed
              while the worker is unavailable.
            </p>
          )}
          <p>
            Fictional duration: {waiting.gameDurationMs / 60000} minutes.
            Reloading never restarts the wait.
          </p>
          {waiting.canControl ? (
            <button
              disabled={pending || args.controlPending}
              onClick={() => void args.onControl(journeyAction(waiting))}
            >
              {waiting.remainingMs === null
                ? 'Pause journey'
                : 'Resume journey'}
            </button>
          ) : null}
        </section>
      ) : null}
      {args.controlPending ? (
        <button disabled={pending} onClick={() => void args.onControl()}>
          Retry control
        </button>
      ) : null}
      {story.decision ? (
        <p>
          Respond by {story.decision.dueAt}. If you do not respond, the default
          is “{defaultLabel}”. This response window cannot be paused. Fiction
          holds while you decide; processing may finish after the deadline.
        </p>
      ) : null}
      {story.current.interaction ? (
        <section aria-label="Offered interaction">
          <p>{story.current.interaction.specification.prompt}</p>
          {story.current.interaction.specification.options.map((option) => (
            <p key={option.id}>
              <button
                disabled={pending || !story.canRespond || args.responsePending}
                onClick={() => void args.onRespond(option.id)}
              >
                {option.label}
              </button>
            </p>
          ))}
          {!story.canRespond ? (
            <p>
              This saved scenario does not support responses. Start a fresh
              chamber to play.
            </p>
          ) : null}
          {args.responsePending ? (
            <button disabled={pending} onClick={() => void args.onRespond()}>
              Retry the same choice
            </button>
          ) : null}
        </section>
      ) : null}
      {story.items.length > 0 ? (
        <section aria-label="Known items">
          <h2>Known items</h2>
          <ul>
            {story.items.map((item) => (
              <li key={item.key}>
                {item.label} — held by {item.holderKey}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <details>
        <summary>Inspect saved state</summary>
        <dl>
          <dt>Story ID</dt>
          <dd>{story.id}</dd>
          <dt>Revision</dt>
          <dd>{story.revision}</dd>
          <dt>Passage ID</dt>
          <dd>{story.current.id}</dd>
          <dt>Interaction ID</dt>
          <dd>{story.current.interaction?.id ?? 'None'}</dd>
        </dl>
      </details>
      <ChamberInspectorPanel
        inspector={args.inspector}
        error={args.inspectorError}
        pending={args.inspectorPending}
        onRefresh={args.onInspect}
      />
      <p>Bookmark this URL to reopen the same story.</p>
      <StoryHistoryView
        key={`${story.id}:${story.revision}`}
        storyId={story.id}
      />
      <a href="/chamber">Prepare a fresh chamber</a>
    </>
  );
}

export function ChamberStart(args: {
  pending: boolean;
  scenario: string;
  startLocked: boolean;
  onScenario: (scenario: string) => void;
  onStart: () => void;
}) {
  const scenarios = listChamberScenarios();
  const selected =
    scenarios.find((entry) => entry.id === args.scenario) ?? scenarios[0];
  return (
    <>
      <h1>A small persistent beginning.</h1>
      <label htmlFor="chamber-scenario">Scenario</label>{' '}
      <select
        id="chamber-scenario"
        value={args.scenario}
        disabled={args.pending || args.startLocked}
        onChange={(event) => args.onScenario(event.target.value)}
      >
        {scenarios.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.name}
          </option>
        ))}
      </select>
      {selected ? (
        <section aria-label="Selected scenario purpose">
          <p>{selected.description}</p>
          <p>Exercises: {selected.exercises.join(', ')}</p>
        </section>
      ) : null}
      <button disabled={args.pending} onClick={() => void args.onStart()}>
        {args.pending ? 'Saving…' : 'Start scripted chamber'}
      </button>
    </>
  );
}
