'use client';

import { usePassageArrival } from './passage-arrival';

/** Published prose in reading order. No page split and no cropped measure. */
export function NarrativeFlow({
  passageId,
  title,
  paragraphs,
  held = false,
}: {
  passageId?: string | undefined;
  title?: string | null | undefined;
  paragraphs: readonly string[];
  /** A pending command is not a published arrival. */
  held?: boolean | undefined;
}) {
  const arriving = usePassageArrival(passageId, 'fade', held);
  return (
    <div className="story-frame__narrative-flow" data-passage-id={passageId}>
      {title ? (
        <h1
          className="story-frame__passage-title"
          data-passage-enter={arriving ? 'true' : 'false'}
        >
          {title}
        </h1>
      ) : null}
      <div className="story-frame__passage">
        {paragraphs.map((paragraph, index) => (
          <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
