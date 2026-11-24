import type { StorySnapshot } from '@offscreen/story-interface/stories';

export function JourneyTimingNotice(props: {
  waiting: NonNullable<StorySnapshot['waiting']>;
  disabled: boolean;
  onControl: () => void;
}) {
  const { waiting, disabled, onControl } = props;

  return (
    <section className="story-frame__notice" aria-label="Journey timing">
      {waiting.remainingMs !== null ? (
        <p>
          Journey paused. {Math.ceil(waiting.remainingMs / 1000)} real seconds
          remain.
        </p>
      ) : (
        <p>
          Still travelling. Arrival estimated at {waiting.dueAt}. Reloading
          never restarts the wait.
        </p>
      )}
      <p>
        Fictional duration: {waiting.gameDurationMs / 60000} minutes. The saved
        deadline is authoritative.
      </p>
      {waiting.canControl ? (
        <button
          type="button"
          className="story-frame__intention"
          disabled={disabled}
          onClick={onControl}
        >
          {waiting.remainingMs === null ? 'Pause' : 'Resume'}
        </button>
      ) : null}
    </section>
  );
}
