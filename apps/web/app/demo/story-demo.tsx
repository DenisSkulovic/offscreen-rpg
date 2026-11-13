'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SceneView } from './scene-view';
import { scenes } from './script';

type Visit = { sceneId: string; intention: string | null };
const beginning: Visit[] = [{ sceneId: 'road', intention: null }];

export function StoryDemo() {
  const [history, setHistory] = useState(beginning);
  const [paused, setPaused] = useState(false);
  const currentId = history[history.length - 1]!.sceneId;
  const scene = scenes[currentId]!;
  useEffect(() => {
    document.querySelector('.story-frame__passage-title')?.scrollIntoView({
      block: 'nearest',
    });
  }, [currentId]);

  function choose(id: string) {
    if (paused) return;
    const next = scene.next[id];
    if (!next) return;
    const intention =
      scene.choices.find((choice) => choice.id === id)?.label ?? null;
    setHistory((current) =>
      current[current.length - 1]!.sceneId === currentId
        ? [...current, { sceneId: next, intention }]
        : current,
    );
  }
  return (
    <div className="story-demo">
      <SceneView scene={scene} paused={paused} onChoose={choose} />
      <aside className="demo-controls" aria-label="Demonstration controls">
        <p>
          Interactive preview. Time is simulated here and this sample resets
          when refreshed. No AI calls or account needed.
        </p>
        <div className="demo-actions">
          {scene.phase !== 'ended' ? (
            <button
              type="button"
              className="quiet-button"
              onClick={() => setPaused(!paused)}
            >
              {paused ? 'Resume preview' : 'Pause preview'}
            </button>
          ) : null}
          {scene.phase === 'waiting' ? (
            <button
              type="button"
              disabled={paused}
              onClick={() => choose('advance')}
            >
              Advance demo time
            </button>
          ) : null}
          {scene.phase === 'ended' ? (
            <button
              type="button"
              onClick={() => {
                setHistory(beginning);
                setPaused(false);
              }}
            >
              Try another path
            </button>
          ) : null}
          <Link className="button" href="/stories/new">
            Create a story
          </Link>
        </div>
      </aside>
      <details className="story-history">
        <summary>
          The story so far <span>{history.length} passages</span>
        </summary>
        <ol>
          {history.map((visit, index) => (
            <li key={`${index}-${visit.sceneId}`}>
              {visit.intention ? (
                <p className="history-intention">
                  You chose: {visit.intention}
                </p>
              ) : null}
              <h2>{scenes[visit.sceneId]!.title}</h2>
              {scenes[visit.sceneId]!.paragraphs.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
