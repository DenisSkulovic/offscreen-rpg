'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import './story-frame.css';

export type StoryFrameIntention = {
  id: string;
  label: string;
  support?: string;
};

export type StoryFrameProps = {
  /** Working Stories list destination. */
  storiesHref: string;
  /**
   * Verified story identity or current passage context.
   * Never invent a title from revision numbers.
   */
  storyLabel: string;
  /** Known place/context only when the source supplies it. */
  situationLabel?: string | null;
  /** Truthful player-facing status such as “Waiting for your choice”. */
  statusLabel?: string | null;
  passageTitle?: string | null;
  paragraphs: readonly string[];
  /** One conditional fact strip; omit when nothing important is known. */
  memory?: string | null;
  intentions?: readonly StoryFrameIntention[];
  thresholdHeading?: string;
  /**
   * Journal only when a real destination exists.
   * Pass null/undefined to omit — never render a dead tab.
   */
  journalHref?: string | null;
  /** Optional low-attention Details disclosure content. */
  details?: ReactNode;
  onIntentionSelect?: (id: string) => void;
};

/**
 * UX01 Living Situation Stage frame.
 * Presentation only: does not own Query, commands, or story truth.
 */
export function StoryFrame({
  storiesHref,
  storyLabel,
  situationLabel = null,
  statusLabel = null,
  passageTitle = null,
  paragraphs,
  memory = null,
  intentions = [],
  thresholdHeading = 'What will you do?',
  journalHref = null,
  details = null,
  onIntentionSelect,
}: StoryFrameProps) {
  const showSituation = Boolean(situationLabel || statusLabel);

  return (
    <div className="story-frame">
      <header className="story-frame__chrome">
        <div className="story-frame__identity">
          <Link className="story-frame__back" href={storiesHref}>
            ← Stories
          </Link>
          <p className="story-frame__label">{storyLabel}</p>
        </div>
        <nav aria-label="Story spaces">
          <ul className="story-frame__nav">
            <li>
              <span aria-current="page">Now</span>
            </li>
            {journalHref ? (
              <li>
                <Link href={journalHref}>Journal</Link>
              </li>
            ) : null}
          </ul>
        </nav>
      </header>

      {showSituation ? (
        <div className="story-frame__situation">
          {situationLabel ? (
            <p className="story-frame__place">{situationLabel}</p>
          ) : (
            <span />
          )}
          {statusLabel ? (
            <p className="story-frame__status" role="status">
              {statusLabel}
            </p>
          ) : null}
        </div>
      ) : null}

      <main className="story-frame__stage">
        {passageTitle ? (
          <h1 className="story-frame__passage-title">{passageTitle}</h1>
        ) : null}
        <div className="story-frame__passage">
          {paragraphs.map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
          ))}
        </div>

        {memory ? <p className="story-frame__memory">{memory}</p> : null}

        {intentions.length > 0 ? (
          <section
            className="story-frame__threshold"
            aria-labelledby="story-frame-threshold-heading"
          >
            <h2
              id="story-frame-threshold-heading"
              className="story-frame__threshold-heading"
            >
              {thresholdHeading}
            </h2>
            <ul className="story-frame__intentions">
              {intentions.map((intention) => (
                <li key={intention.id}>
                  <button
                    type="button"
                    className="story-frame__intention"
                    onClick={() => onIntentionSelect?.(intention.id)}
                  >
                    {intention.label}
                    {intention.support ? (
                      <span className="story-frame__intention-support">
                        {intention.support}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      {details ? (
        <details className="story-frame__secondary">
          <summary>Details</summary>
          {details}
        </details>
      ) : null}
    </div>
  );
}
