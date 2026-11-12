'use client';

import type { StorySnapshot } from '@offscreen/contracts/stories';

/**
 * Presentational Play engineering states for Storybook.
 * No EventSource, no useMutation, no Nest — fixtures only.
 */
export function PlayStatePanel({
  story,
  intentStatus = 'idle',
  statusMessage,
}: {
  story: StorySnapshot;
  intentStatus?: 'idle' | 'awaiting_ack' | 'conflict' | 'blocked' | 'failed';
  statusMessage?: string | null;
}) {
  const offer = story.current.interaction;
  const pendingChoice = intentStatus === 'awaiting_ack';
  const canChoose =
    story.canRespond === true &&
    offer != null &&
    story.resolution == null &&
    !pendingChoice;

  return (
    <main className="story-demo play-screen">
      <header className="story-header">
        <span className="demo-label">Storybook · Play state</span>
      </header>
      <section className="play-main" aria-label="Current scene">
        <article className="story-scene">
          <p className="eyebrow">Current scene</p>
          <h1>{story.current.content.title}</h1>
          <div className="scene-prose">
            {story.current.content.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </article>
        {offer ? (
          <section className="scene-choices" aria-label="Offered interaction">
            <p>{offer.specification.prompt}</p>
            {offer.specification.options.map((option) => (
              <article className="campaign-option" key={option.id}>
                <button type="button" disabled={!canChoose}>
                  {option.label}
                </button>
              </article>
            ))}
          </section>
        ) : null}
        {statusMessage ? (
          <p className="scene-status" role="status">
            {statusMessage}
          </p>
        ) : null}
        {intentStatus === 'conflict' ||
        intentStatus === 'blocked' ||
        intentStatus === 'failed' ? (
          <p role="alert">
            Choice recovery: {intentStatus}. Retry uses the same frozen
            operation id; Storybook does not POST.
          </p>
        ) : null}
        {story.resolution?.canRetry ? (
          <section aria-label="Resolution recovery">
            <button type="button" disabled>
              Refresh saved state
            </button>
            <button type="button" disabled>
              Retry this intention
            </button>
          </section>
        ) : null}
      </section>
    </main>
  );
}

export function playStatusForResolution(
  story: StorySnapshot,
): string | null {
  if (!story.resolution) {
    return null;
  }
  if (story.resolution.state === 'uncertain') {
    return 'Provider usage is uncertain. Paid generation is stopped until it is reconciled; refreshing does not send another model request.';
  }
  if (story.resolution.state === 'failed') {
    return 'Continuation failed. Your intention is saved and the current scene is unchanged.';
  }
  if (story.resolution.state === 'blocked') {
    return 'The saved continuation could not be published. Your current scene is unchanged.';
  }
  if (story.resolution.state === 'pending' || story.resolution.state === 'running') {
    return 'The storyteller is resolving this intention.';
  }
  return null;
}
