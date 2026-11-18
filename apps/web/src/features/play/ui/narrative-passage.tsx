'use client';

import type { ResolvedMedia, ResolvedPresentation } from '../presentation/types';
import { usePassageArrival } from './passage-arrival';
import { SceneMedia } from './scene-media';

export function NarrativePassage({
  passageId,
  title,
  paragraphs,
  media = [],
  identity,
  arrival = 'none',
  held = false,
}: {
  passageId?: string | undefined;
  title?: string | null | undefined;
  paragraphs: readonly string[];
  media?: readonly ResolvedMedia[] | undefined;
  identity: string;
  arrival?: ResolvedPresentation['passageArrival'] | undefined;
  /** A pending command is not a published arrival. */
  held?: boolean | undefined;
}) {
  const arriving = usePassageArrival(passageId, arrival, held);
  const before = media.filter((item) => item.slot.kind === 'before-passage');
  const after = media.filter((item) => item.slot.kind === 'after-passage');
  return (
    <article
      className="story-frame__narrative"
      data-passage-id={passageId}
      data-arrival={arriving ? arrival : 'none'}
    >
      {before.map((item) => (
        <SceneMedia
          key={item.id}
          media={item}
          identity={identity}
          className="story-frame__figure"
        />
      ))}
      {title ? <h1 className="story-frame__passage-title">{title}</h1> : null}
      <div className="story-frame__passage">
        {paragraphs.map((paragraph, index) => (
          <div key={`${passageId ?? 'passage'}-${index}`}>
            <p>{paragraph}</p>
            {media
              .filter(
                (item) =>
                  item.slot.kind === 'after-paragraph' &&
                  item.slot.index === index,
              )
              .map((item) => (
                <SceneMedia
                  key={item.id}
                  media={item}
                  identity={identity}
                  className="story-frame__figure"
                />
              ))}
          </div>
        ))}
      </div>
      {after.map((item) => (
        <SceneMedia
          key={item.id}
          media={item}
          identity={identity}
          className="story-frame__figure"
        />
      ))}
    </article>
  );
}
