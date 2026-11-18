'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';

/** Quiet contents. Closed items are not mounted, so they cannot take focus. */
export function BookContents({
  storiesHref,
  journalHref = null,
  mode,
  storyLabel,
}: {
  storiesHref: string;
  journalHref?: string | null | undefined;
  mode: 'now' | 'journal';
  storyLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const menuId = useId();

  useEffect(() => {
    setOpen(false);
  }, [storyLabel]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    function onPointer(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        menuRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <div className="story-frame__contents">
      <button
        ref={triggerRef}
        type="button"
        className="story-frame__contents-trigger"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        Contents
      </button>
      {open ? (
        <nav
          ref={menuRef}
          id={menuId}
          className="story-frame__contents-menu"
          aria-label="Story spaces"
        >
          <Link href={storiesHref} onClick={() => setOpen(false)}>
            ← Stories
          </Link>
          {journalHref ? (
            <a
              href="#story-frame-now"
              aria-current={mode === 'now' ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              Now
            </a>
          ) : null}
          {journalHref ? (
            <a
              href={journalHref}
              aria-current={mode === 'journal' ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              Journal
            </a>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
