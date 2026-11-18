/** Published prose in reading order. No page split and no cropped measure. */
export function NarrativeFlow({
  passageId,
  title,
  paragraphs,
}: {
  passageId?: string | undefined;
  title?: string | null | undefined;
  paragraphs: readonly string[];
}) {
  return (
    <div className="story-frame__narrative-flow" data-passage-id={passageId}>
      {title ? (
        <h1
          key={title}
          className="story-frame__passage-title"
          data-passage-enter="true"
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
