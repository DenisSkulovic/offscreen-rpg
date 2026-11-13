'use client';

import { useEffect, useRef, useState } from 'react';
import type { ResolvedMedia, ResolvedPresentation } from '../presentation/types';
import { SceneMedia } from './scene-media';

function usePassageArrival(
  passageId: string | undefined,
  style: ResolvedPresentation['passageArrival'],
) {
  const previous = useRef<string | null>(null);
  const [arrival, setArrival] = useState(false);
  useEffect(() => {
    const prior = previous.current;
    previous.current = passageId ?? null;
    if (prior === null || style === 'none' || prior === passageId) {
      setArrival(false);
      return;
    }
    setArrival(true);
  }, [passageId, style]);
  return arrival;
}

export function NarrativePassage({
  passageId,
  title,
  paragraphs,
  media = [],
  identity,
  arrival = 'none',
}: {
  passageId?: string;
  title?: string | null;
  paragraphs: readonly string[];
  media?: readonly ResolvedMedia[];
  identity: string;
  arrival?: ResolvedPresentation['passageArrival'];
}) {
  const arriving = usePassageArrival(passageId, arrival);
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
