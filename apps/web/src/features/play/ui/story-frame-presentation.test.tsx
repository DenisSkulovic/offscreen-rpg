import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StoryFrame } from './story-frame';
import { NarrativePassage } from './narrative-passage';
import {
  cavePresentation,
  caveScope,
  harborPresentation,
  harborScope,
  resolveFixture,
} from '../presentation/fixtures';

const paragraphs = ['The landing is wet.', 'A coat drips onto the boards.'];

describe('StoryFrame presentation', () => {
  it('leaves the baseline stage free of mocked art direction', () => {
    const { container } = render(
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Greywake"
        passageTitle="Someone at the door"
        paragraphs={paragraphs}
        intentions={[{ id: 'ask', label: 'Ask who sent the visitor' }]}
        onIntentionSelect={() => undefined}
      />,
    );
    expect(container.querySelector('[data-mocked-presentation]')).toBeNull();
    expect(container.querySelector('.story-frame__chrome')).toBeNull();
    expect(container.querySelector('.story-frame__book')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Someone at the door' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ask who sent the visitor/i })).toBeEnabled();
  });

  it('restyles the stage from a fixture without changing the chosen id', async () => {
    const user = userEvent.setup();
    const onIntentionSelect = vi.fn();
    const harbor = resolveFixture(harborPresentation, harborScope);
    render(
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Greywake"
        passageId="passage-harbor"
        interactionId="interaction-harbor"
        passageTitle="Someone at the door"
        paragraphs={paragraphs}
        presentation={harbor}
        intentions={[
          { id: 'ask', label: 'Ask who sent the visitor' },
          { id: 'withdraw', label: 'Withdraw to the shelter' },
        ]}
        onIntentionSelect={onIntentionSelect}
      />,
    );
    const stage = document.querySelector('.story-viewport');
    expect(stage).toHaveAttribute('data-mocked-presentation', 'true');
    const plane = document.querySelector('.story-viewport__plane');
    expect(plane?.getAttribute('style') ?? '').toContain('linear-gradient');
    await user.click(screen.getByRole('button', { name: /Withdraw to the shelter/i }));
    expect(onIntentionSelect).toHaveBeenCalledTimes(1);
    expect(onIntentionSelect).toHaveBeenCalledWith('withdraw');
  });

  it('keeps a hostile palette off reader ink, focus, and system status', async () => {
    const user = userEvent.setup();
    const onIntentionSelect = vi.fn();
    const harbor = resolveFixture(harborPresentation, harborScope);
    const hostile = {
      ...harbor,
      narrative: {
        ...harbor.narrative,
        ink: '#39ff14',
        muted: '#39ff14',
        quiet: '#39ff14',
      },
      ink: '#39ff14',
      muted: '#39ff14',
      quiet: '#39ff14',
      focus: '#ff00ff',
      status: '#ff00ff',
      accent: '#ff00ff',
      actionInk: '#00ff88',
    };
    render(
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Greywake"
        passageId="passage-harbor"
        interactionId="interaction-harbor"
        passageTitle="Someone at the door"
        paragraphs={paragraphs}
        statusLabel="The repair failed"
        presentation={hostile}
        intentions={[{ id: 'withdraw', label: 'Withdraw to the shelter' }]}
        onIntentionSelect={onIntentionSelect}
      />,
    );
    const stage = document.querySelector('.story-viewport');
    const style = stage?.getAttribute('style') ?? '';
    for (const key of [
      '--sf-ink',
      '--sf-ink-muted',
      '--sf-ink-quiet',
      '--sf-focus',
      '--sf-action',
      '--sf-action-ink',
      '--sf-status-attention',
      '--ui-danger',
      '--ui-focus',
      '--ui-action',
      '--reader-ink',
    ]) {
      expect(style, key).not.toContain(key);
    }
    expect(style).toContain('--sf-stage');
    expect(style).not.toContain('#39ff14');
    expect(style).not.toContain('#ff00ff');
    expect(screen.getByRole('heading', { name: 'Someone at the door' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /Withdraw to the shelter/i }));
    expect(onIntentionSelect).toHaveBeenCalledWith('withdraw');
  });

  it('animates a new passage id and not a same-id refresh', async () => {
    const cave = resolveFixture(cavePresentation, caveScope);
    const { rerender } = render(
      <NarrativePassage
        passageId="passage-a"
        title="Same title"
        paragraphs={['First.']}
        identity="story:passage-a"
        arrival={cave.passageArrival}
      />,
    );
    expect(document.querySelector('[data-arrival]')?.getAttribute('data-arrival')).toBe('none');
    rerender(
      <NarrativePassage
        passageId="passage-a"
        title="Same title"
        paragraphs={['First.']}
        identity="story:passage-a"
        arrival={cave.passageArrival}
      />,
    );
    expect(document.querySelector('[data-arrival]')?.getAttribute('data-arrival')).toBe('none');
    rerender(
      <NarrativePassage
        passageId="passage-b"
        title="Same title"
        paragraphs={['Second.']}
        identity="story:passage-b"
        arrival={cave.passageArrival}
      />,
    );
    expect(document.querySelector('[data-arrival]')?.getAttribute('data-arrival')).toBe('rise-subtle');
  });
});
