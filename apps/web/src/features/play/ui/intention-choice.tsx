'use client';

import type { CSSProperties } from 'react';
import type { ResolvedChoice } from '../presentation/types';

export function IntentionChoice({
  label,
  support,
  disabled = false,
  behavior,
  treatment,
  onClick,
}: {
  label: string;
  support?: string;
  disabled?: boolean;
  behavior: 'commit' | 'explore';
  treatment?: ResolvedChoice;
  onClick: () => void;
}) {
  const style = treatment
    ? ({
        '--sf-choice-accent': treatment.accent,
        '--sf-choice-ink': treatment.ink,
      } as CSSProperties)
    : undefined;
  return (
    <button
      type="button"
      className={`story-frame__intention story-frame__intention--${behavior}`}
      data-surface={treatment?.surface}
      data-effect={treatment?.effect ?? 'none'}
      style={style}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
      {support ? (
        <span className="story-frame__intention-support">{support}</span>
      ) : null}
    </button>
  );
}
