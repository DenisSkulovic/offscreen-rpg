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
    document.getElementById('scene-title')?.focus();
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
    <main className="story-demo">
      <header className="story-header">
        <Link href="/">Offscreen RPG</Link>
        <span className="demo-label">Scripted experience</span>
        {scene.phase !== 'ended' && (
          <button className="quiet-button" onClick={() => setPaused(!paused)}>
            {paused ? 'Resume' : 'Pause'}
          </button>
        )}
      </header>
      <SceneView scene={scene} paused={paused} onChoose={choose} />
      <aside className="demo-controls" aria-label="Demonstration controls">
        <p>
          This is an authored browser prototype. No AI calls or account needed.
          Time advances manually; refreshing restarts the story.
        </p>
        {scene.phase === 'waiting' && (
          <button disabled={paused} onClick={() => choose('advance')}>
            Advance demo time
          </button>
        )}
        {scene.phase === 'ended' && (
          <button
            onClick={() => {
              setHistory(beginning);
              setPaused(false);
            }}
          >
            Try another path
          </button>
        )}
      </aside>
      <details className="story-history">
        <summary>
          The story so far <span>{history.length} passages</span>
        </summary>
        <ol>
          {history.map((visit, index) => (
            <li key={`${index}-${visit.sceneId}`}>
              {visit.intention && (
                <p className="history-intention">
                  You chose: {visit.intention}
                </p>
              )}
              <h2>{scenes[visit.sceneId]!.title}</h2>
              {scenes[visit.sceneId]!.paragraphs.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </li>
          ))}
        </ol>
      </details>
    </main>
  );
}
