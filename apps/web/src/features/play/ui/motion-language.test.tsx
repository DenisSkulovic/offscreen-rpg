import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NarrativeFlow } from './narrative-flow';
import { StoryFrame } from './story-frame';

const frameProps = {
  storiesHref: '/stories',
  storyLabel: 'Greywake',
  passageTitle: 'Someone at the door',
  journalHref: '#story-journal',
  journal: <h2>Saved passage</h2>,
  intentions: [{ id: 'ask', label: 'Ask who sent the visitor' }],
};

describe('motion language (UI08)', () => {
  it('marks a new passage id and ignores a same-id refresh', () => {
    const { rerender } = render(
      <NarrativeFlow
        passageId="passage-a"
        title="Same title"
        paragraphs={['First published line.']}
      />,
    );
    const title = () => screen.getByRole('heading', { name: 'Same title' });
    expect(title()).toHaveAttribute('data-passage-enter', 'false');

    rerender(
      <NarrativeFlow
        passageId="passage-a"
        title="Renamed without a new source"
        paragraphs={['First published line. refreshed.']}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Renamed without a new source' }),
    ).toHaveAttribute('data-passage-enter', 'false');

    rerender(
      <NarrativeFlow
        passageId="passage-b"
        title="Renamed without a new source"
        paragraphs={['A later published line.']}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Renamed without a new source' }),
    ).toHaveAttribute('data-passage-enter', 'true');
  });

  it('holds the arrival mark while a command is pending', () => {
    const { rerender } = render(
      <StoryFrame
        {...frameProps}
        paragraphs={['The landing is wet.']}
        passageId="passage-a"
        onIntentionSelect={() => undefined}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Someone at the door' })).toHaveAttribute(
      'data-passage-enter',
      'false',
    );
    rerender(
      <StoryFrame
        {...frameProps}
        paragraphs={['The landing is wet.']}
        passageId="passage-b"
        intentionsDisabled
        onIntentionSelect={() => undefined}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Someone at the door' })).toHaveAttribute(
      'data-passage-enter',
      'false',
    );
    expect(screen.getByRole('button', { name: /Ask who sent the visitor/i })).toBeDisabled();

    rerender(
      <StoryFrame
        {...frameProps}
        paragraphs={['The landing is wet.']}
        passageId="passage-b"
        onIntentionSelect={() => undefined}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Someone at the door' })).toHaveAttribute(
      'data-passage-enter',
      'true',
    );
    expect(screen.getByRole('button', { name: /Ask who sent the visitor/i })).toBeEnabled();
  });

  it('cues a contents jump and stays still for a hash change without that click', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    window.location.hash = '#story-journal';
    const { unmount } = render(
      <StoryFrame {...frameProps} paragraphs={['The landing is wet.']} />,
    );
    expect(document.querySelector('[data-read-view="enter"]')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Saved passage' })).toBeVisible();
    unmount();

    window.location.hash = '';
    render(
      <StoryFrame
        {...frameProps}
        paragraphs={['The landing is wet.']}
        onIntentionSelect={() => undefined}
      />,
    );
    await act(async () => {
      window.location.hash = '#story-journal';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(screen.getByRole('heading', { name: 'Saved passage' })).toBeVisible();
    expect(document.querySelector('[data-read-view="enter"]')).toBeNull();
    expect(
      screen.getByRole('button', { name: /Ask who sent the visitor/i, hidden: true }),
    ).toBeEnabled();

    await act(async () => {
      window.location.hash = '';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    await user.click(screen.getByRole('button', { name: 'Contents' }));
    const journal = screen.getByRole('link', { name: 'Journal' });
    expect(journal).toBeEnabled();
    await user.click(journal);
    await act(async () => {
      window.location.hash = '#story-journal';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(document.getElementById('story-journal')).toHaveAttribute(
      'data-read-view',
      'enter',
    );
    expect(screen.getByRole('heading', { name: 'Saved passage' })).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    window.location.hash = '';
  });
});

describe('motion off switch', () => {
  it('cancels menu, leaf, arrival, drift, and pulse when motion is reduced', () => {
    const css = readFileSync(path.join(__dirname, 'story-frame.css'), 'utf8');
    const blocks = css
      .split('@media (prefers-reduced-motion: reduce)')
      .slice(1)
      .map((block) => block.slice(0, 800));
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    const off = blocks.join('\n');
    expect(off).toMatch(/\.story-frame__contents-menu/);
    expect(off).toMatch(/data-read-view='enter'/);
    expect(off).toMatch(/data-passage-enter='true'/);
    expect(off).toMatch(/pulse-soft/);
    expect(off).toMatch(/drift-soft/);
    expect(off).toMatch(/animation:\s*none/);
    const cues = css.slice(
      css.indexOf('@keyframes sf-menu-open'),
      css.indexOf('@media (max-width: 720px)'),
    );
    expect(cues).not.toMatch(/pointer-events/);
    expect(css).not.toMatch(/animation-timeline/);
  });
});
