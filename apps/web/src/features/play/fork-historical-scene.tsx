'use client';

import type { HistoricalScene } from '@offscreen/story-interface/stories';
import { useForkHistoricalScene } from './use-fork-historical-scene';

export function ForkHistoricalScene({
  sourceStoryId,
  scene,
}: {
  sourceStoryId: string;
  scene: HistoricalScene;
}) {
  const { fork, pending, forked, ready } = useForkHistoricalScene({
    sourceStoryId,
    scene,
  });
  const options =
    scene.current.interaction?.specification.kind === 'choice.v1'
      ? scene.current.interaction.specification.options
      : [];
  const commitments = scene.campaign?.commitments ?? [];

  return (
    <section
      className="story-frame__journal"
      aria-label="Historical fork"
      data-testid="historical-fork-panel"
    >
      <h3 className="story-frame__threshold-heading">Choices at this scene</h3>
      {options.length > 0 ? (
        <ul className="story-frame__journal-list">
          {options.map((option) => (
            <li key={option.id} className="story-frame__intention-support">
              {option.label}
            </li>
          ))}
        </ul>
      ) : (
        <p className="story-frame__intention-support">
          No player choice was recorded at this checkpoint.
        </p>
      )}
      {commitments.length > 0 ? (
        <>
          <h3 className="story-frame__threshold-heading">Commitments</h3>
          <ul className="story-frame__journal-list">
            {commitments.map((commitment) => (
              <li key={commitment.id} className="story-frame__intention-support">
                {commitment.label}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {scene.items.length > 0 ? (
        <>
          <h3 className="story-frame__threshold-heading">Items</h3>
          <ul className="story-frame__journal-list">
            {scene.items.map((item) => (
              <li key={item.key} className="story-frame__intention-support">
                {item.label} ({item.holderKey})
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <button
        type="button"
        className="story-frame__intention story-frame__intention--explore"
        disabled={!ready || pending || forked}
        onClick={() => void fork()}
      >
        Fork from this scene
      </button>
    </section>
  );
}