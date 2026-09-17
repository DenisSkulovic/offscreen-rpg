'use client';

import type { StorySnapshot } from '@offscreen/contracts/stories';
import { SessionRefresh } from '../../stories/session-refresh';

export function PlayScene({ story }: { story: StorySnapshot }) {
  const offer = story.current.interaction;
  return (
    <main className="editor">
      <SessionRefresh />
      <p className="eyebrow">Offscreen RPG · Live story</p>
      <h1>{story.current.content.title}</h1>
      {story.current.content.paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
      {offer ? (
        <section aria-label="Offered interaction">
          <p>{offer.specification.prompt}</p>
          {offer.specification.options.map((option) => (
            <p key={option.id}>
              <button type="button" disabled>
                {option.label}
              </button>
            </p>
          ))}
          <p>Continuation is not connected yet.</p>
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
        </dl>
      </details>
      <p>Bookmark this URL to reopen the same story.</p>
      <p>
        <a href="/stories">Back to stories</a>
      </p>
    </main>
  );
}
