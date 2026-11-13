'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  createInitialDemoState,
  replayDemo,
  setDemoPaused,
  transitionDemo,
  visibleChoices,
  waitingAdvanceLabel,
} from './demo-state';
import { SceneView } from './scene-view';
import { scenes } from './script';

export function StoryDemo() {
  const [state, setState] = useState(createInitialDemoState);
  const scene = scenes[state.sceneId];
  const choices = visibleChoices(state.sceneId, state.facts);

  function choose(id: string) {
    setState((current) => transitionDemo(current, id));
  }

  return (
    <div className="story-demo">
      <SceneView
        scene={scene}
        facts={state.facts}
        paused={state.paused}
        choices={choices}
        onChoose={choose}
      />
      <aside className="demo-controls" aria-label="Demonstration controls">
        <p>
          Scripted preview · simulated time · resets when refreshed. No AI
          calls or account needed.
        </p>
        <div className="demo-actions">
          {scene.phase !== 'ended' ? (
            <button
              type="button"
              className="quiet-button"
              onClick={() =>
                setState((current) =>
                  setDemoPaused(current, !current.paused),
                )
              }
            >
              {state.paused ? 'Resume preview' : 'Pause preview'}
            </button>
          ) : null}
          {scene.phase === 'waiting' ? (
            <button
              type="button"
              disabled={state.paused}
              onClick={() => choose('advance')}
            >
              {waitingAdvanceLabel(state.sceneId)}
            </button>
          ) : null}
          {scene.phase === 'ended' ? (
            <>
              <button
                type="button"
                onClick={() => setState(replayDemo())}
              >
                Replay preview
              </button>
              <Link className="button" href="/stories/new">
                Create a persistent story
              </Link>
              <Link className="quiet-button" href="/rules">
                How earned time works
              </Link>
              <a
                className="quiet-button"
                href="https://github.com/DenisSkulovic/offscreen-rpg"
                rel="noreferrer"
                target="_blank"
              >
                View source &amp; proof
              </a>
            </>
          ) : (
            <Link className="button" href="/stories/new">
              Create a persistent story
            </Link>
          )}
        </div>
      </aside>
      <details className="story-history">
        <summary>
          The story so far <span>{state.history.length} passages</span>
        </summary>
        <ol>
          {state.history.map((visit, index) => (
            <li key={`${index}-${visit.sceneId}`}>
              {visit.intention ? (
                <p className="history-intention">
                  You chose: {visit.intention}
                </p>
              ) : null}
              <h2>{scenes[visit.sceneId].title}</h2>
              {scenes[visit.sceneId].paragraphs.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
