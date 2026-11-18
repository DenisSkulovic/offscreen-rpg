'use client';

import Link from 'next/link';
import { useEffect, useRef, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { matchLegacyChoice } from '../presentation/resolve';
import type { ResolvedPresentation } from '../presentation/types';
import { BookSurface } from './book-surface';
import { DecisionGroup } from './decision-group';
import { NarrativeFlow } from './narrative-flow';
import { NarrativePassage } from './narrative-passage';
import { SceneMedia } from './scene-media';
import './story-frame.css';

export type StoryFrameIntention = {
  id: string;
  label: string;
  support?: string | undefined;
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
  situationLabel?: string | null | undefined;
  /** Truthful player-facing status such as “Waiting for your choice”. */
  statusLabel?: string | null | undefined;
  passageTitle?: string | null | undefined;
  paragraphs: readonly string[];
  /** One conditional fact strip; omit when nothing important is known. */
  memory?: string | null | undefined;
  intentions?: readonly StoryFrameIntention[] | undefined;
  thresholdHeading?: string | undefined;
  /**
   * Journal only when a real destination exists.
   * Pass null/undefined to omit — never render a dead tab.
   */
  journalHref?: string | null | undefined;
  /**
   * Read-only Journal body. When present, `#story-journal` is a primary
   * book leaf. Hash `#story-journal` / `#story-frame-now` selects the leaf.
   */
  journal?: ReactNode | undefined;
  /** Quiet settings and technical disclosure. Not the Journal. */
  details?: ReactNode | undefined;
  /**
   * Extra stage content after the passage/memory strip
   * (holds, recovery, campaign play, custom decision UI).
   */
  stageExtras?: ReactNode | undefined;
  /** When true, intention buttons stay visible but do not accept activation. */
  intentionsDisabled?: boolean | undefined;
  onIntentionSelect?: ((id: string) => void) | undefined;
  /** Verified published passage. Arrival motion uses this, never the title. */
  passageId?: string | undefined;
  /** Legacy interaction whose options may receive fixture treatments. */
  interactionId?: string | undefined;
  /**
   * Optional resolved presentation. Real Play omits this until a public
   * projection exists. Absent means the baseline field journal.
   */
  presentation?: ResolvedPresentation | null | undefined;
};

const JOURNAL_HASH = '#story-journal';

function subscribeLocationHash(onStoreChange: () => void) {
  window.addEventListener('hashchange', onStoreChange);
  window.addEventListener('popstate', onStoreChange);
  return () => {
    window.removeEventListener('hashchange', onStoreChange);
    window.removeEventListener('popstate', onStoreChange);
  };
}

function readLocationHash() {
  return window.location.hash;
}

function useLocationHash() {
  return useSyncExternalStore(subscribeLocationHash, readLocationHash, () => '');
}

/**
 * Living Book shell (BOOK01). Presentation only: does not own Query,
 * commands, or story truth. One flowing leaf; no page-curl.
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
  journal = null,
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
  const hash = useLocationHash();
  const journalMode = Boolean(journal) && hash === JOURNAL_HASH;
  const mode = journalMode ? 'journal' : 'now';
  const modeRef = useRef(mode);
  useEffect(() => {
    if (modeRef.current === mode) return;
    modeRef.current = mode;
    document
      .getElementById(mode === 'journal' ? 'story-journal' : 'story-frame-now')
      ?.focus();
  }, [mode]);
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
        '--sf-option-bg': presentation?.options.surface,
        '--sf-option-ink': presentation?.options.ink,
        '--sf-option-muted': presentation?.options.muted,
        '--sf-option-edge': presentation?.options.edge,
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
      <BookSurface labelId="story-frame-label">
      <header className="story-frame__book-head">
        <p id="story-frame-label" className="story-frame__label">
          {storyLabel}
        </p>
        <nav className="story-frame__contents" aria-label="Story spaces">
          <Link className="story-frame__back" href={storiesHref}>
            ← Stories
          </Link>
          {journalHref ? (
            <a
              href="#story-frame-now"
              aria-current={mode === 'now' ? 'page' : undefined}
            >
              Now
            </a>
          ) : null}
          {journalHref ? (
            <a
              href={journalHref}
              aria-current={mode === 'journal' ? 'page' : undefined}
            >
              Journal
            </a>
          ) : null}
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

      <main
        id="story-frame-now"
        className="story-frame__stage"
        tabIndex={-1}
        hidden={journalMode}
      >
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
          <NarrativeFlow
            passageId={passageId}
            title={passageTitle}
            paragraphs={paragraphs}
          />
        )}

        {memory ? <p className="story-frame__memory">{memory}</p> : null}

        {stageExtras}

        <DecisionGroup
          heading={thresholdHeading}
          intentions={intentions}
          disabled={intentionsDisabled}
          treatmentFor={(id) =>
            presentation && interactionId
              ? matchLegacyChoice(presentation, interactionId, id)
              : undefined
          }
          onSelect={(id) => onIntentionSelect?.(id)}
        />
      </main>

      {journal ? (
        <section
          id="story-journal"
          className="story-frame__leaf"
          aria-label="Journal"
          tabIndex={-1}
          hidden={!journalMode}
        >
          {journal}
        </section>
      ) : null}

      {details ? (
        <details className="story-frame__secondary">
          <summary>Details</summary>
          {details}
        </details>
      ) : null}
      </BookSurface>
    </div>
    </div>
  );
}
