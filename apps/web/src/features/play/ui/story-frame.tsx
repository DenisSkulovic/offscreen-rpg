'use client';

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { matchLegacyChoice } from '../presentation/resolve';
import type { ResolvedPresentation } from '../presentation/types';
import { IntentionChoice } from './intention-choice';
import { NarrativePassage } from './narrative-passage';
import { SceneMedia } from './scene-media';
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
  /**
   * Extra stage content after the passage/memory strip
   * (holds, recovery, campaign play, custom decision UI).
   */
  stageExtras?: ReactNode;
  /** When true, intention buttons stay visible but do not accept activation. */
  intentionsDisabled?: boolean;
  onIntentionSelect?: (id: string) => void;
  /** Verified published passage. Arrival motion uses this, never the title. */
  passageId?: string;
  /** Legacy interaction whose options may receive fixture treatments. */
  interactionId?: string;
  /**
   * Optional resolved presentation. Real Play omits this until a public
   * projection exists. Absent means the baseline field journal.
   */
  presentation?: ResolvedPresentation | null;
};

/**
 * Living Situation Stage frame (UX01/UX02).
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
  stageExtras = null,
  intentionsDisabled = false,
  onIntentionSelect,
  passageId,
  interactionId,
  presentation = null,
}: StoryFrameProps) {
  const showSituation = Boolean(situationLabel || statusLabel);
  const presented = Boolean(presentation?.applied);
  const identity = `${presentation?.storyId ?? 'story'}:${passageId ?? 'passage'}`;
  const backdropMedia = presentation?.media.find(
    (item) => item.slot.kind === 'backdrop',
  );
  const inlineMedia =
    presentation?.media.filter((item) => item.slot.kind !== 'backdrop') ?? [];
  const style = presented
    ? ({
        '--sf-chrome-bg': presentation?.chrome.surface,
        '--sf-chrome-ink': presentation?.chrome.ink,
        '--sf-chrome-muted': presentation?.chrome.muted,
        '--sf-stage': presentation?.narrative.surface,
        '--sf-ink': presentation?.narrative.ink,
        '--sf-ink-muted': presentation?.narrative.muted,
        '--sf-ink-quiet': presentation?.narrative.quiet,
        '--sf-option-bg': presentation?.options.surface,
        '--sf-option-ink': presentation?.options.ink,
        '--sf-option-muted': presentation?.options.muted,
        '--sf-option-edge': presentation?.options.edge,
        '--sf-action': presentation?.accent,
        '--sf-action-ink': presentation?.actionInk,
        '--sf-focus': presentation?.focus,
        '--sf-status-attention': presentation?.status,
        '--sf-vignette': String(presentation?.vignette ?? 0.2),
        '--sf-texture': String(presentation?.textureIntensity ?? 0.15),
      } as CSSProperties)
    : undefined;

  return (
    <div
      className={presented ? 'story-viewport' : undefined}
      data-lighting={presented ? presentation?.lighting : undefined}
      data-stage={presented ? presentation?.stage : undefined}
      data-texture={presented ? presentation?.texture : undefined}
      data-typography={presented ? presentation?.typography : undefined}
      data-ambient={presented ? presentation?.ambient : undefined}
      data-mocked-presentation={presented ? 'true' : undefined}
      style={style}
    >
      {presented ? (
        <div className="story-viewport__atmosphere" aria-hidden="true">
          <div
            className="story-viewport__plane"
            style={{
              background:
                presentation?.backdrop.kind === 'solid'
                  ? presentation.backdrop.color
                  : presentation?.backdrop.css,
            }}
          />
          {backdropMedia ? (
            <SceneMedia
              media={backdropMedia}
              identity={identity}
              className="story-viewport__media"
            />
          ) : null}
        </div>
      ) : null}
    <div
      className="story-frame"
      data-presented={presented ? 'true' : undefined}
    >
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
            <p className="story-frame__status">{statusLabel}</p>
          ) : null}
        </div>
      ) : null}

      <main id="story-frame-now" className="story-frame__stage">
        {presented ? (
          <NarrativePassage
            passageId={passageId}
            title={passageTitle}
            paragraphs={paragraphs}
            media={inlineMedia}
            identity={identity}
            arrival={presentation?.passageArrival ?? 'none'}
          />
        ) : (
          <>
            {passageTitle ? (
              <h1
                key={passageTitle}
                className="story-frame__passage-title"
                data-passage-enter="true"
              >
                {passageTitle}
              </h1>
            ) : null}
            <div className="story-frame__passage">
              {paragraphs.map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
              ))}
            </div>
          </>
        )}

        {memory ? <p className="story-frame__memory">{memory}</p> : null}

        {stageExtras}

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
                  <IntentionChoice
                    label={intention.label}
                    support={intention.support}
                    behavior="commit"
                    disabled={intentionsDisabled}
                    treatment={
                      presentation && interactionId
                        ? matchLegacyChoice(
                            presentation,
                            interactionId,
                            intention.id,
                          )
                        : undefined
                    }
                    onClick={() => onIntentionSelect?.(intention.id)}
                  />
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
    </div>
  );
}
