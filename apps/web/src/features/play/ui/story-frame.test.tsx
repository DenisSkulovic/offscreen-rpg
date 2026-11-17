import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { StoryFrame } from './story-frame';

const shortParagraphs = [
  'Someone in a soaked harbor coat has climbed onto the landing.',
  'They stop beside the mechanism. "Is the light being repaired?"',
];

const longParagraphs = [
  ...shortParagraphs,
  'The wind from the channel pushes salt into the open door and lifts unfinished notes on the workbench.',
  'Behind them the raised path toward the marsh keeps its own silence; nothing in the office invents urgency the world has not earned.',
  'Выпускные бумаги лежат рядом с мокрым краем стола — mixed scripts must remain readable.',
];

describe('StoryFrame (UX01)', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('renders the book shell without a top chrome bar or a dead Journal link', async () => {
    const { container } = render(
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Greywake"
        situationLabel="The beacon landing"
        statusLabel="Waiting for your choice"
        passageTitle="Someone at the door"
        paragraphs={shortParagraphs}
        memory="Repair stopped · 3/9 earned"
        intentions={[
          {
            id: 'ask',
            label: 'Ask who sent the visitor',
            support: 'Brief conversation',
          },
          {
            id: 'withdraw',
            label: 'Withdraw to the shelter',
            support: 'Leave without losing your work',
          },
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: /Stories/i })).toHaveAttribute(
      'href',
      '/stories',
    );
    expect(screen.getByText('Greywake')).toBeInTheDocument();
    expect(screen.getByText(/Waiting for your choice/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Someone at the door' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Repair stopped/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /What will you do/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Journal$/i })).toBeNull();
    expect(document.querySelector('.story-frame__chrome')).toBeNull();
    expect(document.querySelector('.story-frame__book')).not.toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows Journal only when a working history destination is supplied', () => {
    render(
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Greywake"
        paragraphs={shortParagraphs}
        journalHref="/play/story-a#history"
      />,
    );
    expect(screen.getByRole('link', { name: /Journal/i })).toHaveAttribute(
      'href',
      '/play/story-a#history',
    );
  });

  it('keeps long and non-Latin prose in reading order at narrow width', () => {
    render(
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Невыговоримое-имя-истории"
        paragraphs={longParagraphs}
        intentions={[{ id: 'wait', label: 'Wait and observe' }]}
      />,
    );
    const stage = document.querySelector('.story-frame__stage');
    expect(stage?.textContent).toMatch(/mixed scripts must remain readable/);
    expect(screen.getByRole('button', { name: /Wait and observe/i })).toBeEnabled();
  });

  it('does not invent situation chrome when source supplies none', () => {
    render(
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Current passage"
        paragraphs={['A quiet morning without instruments.']}
      />,
    );
    expect(screen.queryByRole('status')).toBeNull();
    expect(document.querySelector('.story-frame__place')).toBeNull();
    expect(screen.queryByRole('heading', { name: /What will you do/i })).toBeNull();
  });

  it('exposes keyboard-reachable intentions without submitting on render', async () => {
    const user = userEvent.setup();
    const onIntentionSelect = vi.fn();
    render(
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Greywake"
        paragraphs={shortParagraphs}
        intentions={[{ id: 'ask', label: 'Ask who sent the visitor' }]}
        onIntentionSelect={onIntentionSelect}
      />,
    );
    expect(onIntentionSelect).not.toHaveBeenCalled();
    await user.tab();
    await user.tab();
    const choice = screen.getByRole('button', {
      name: /Ask who sent the visitor/i,
    });
    choice.focus();
    await user.keyboard('{Enter}');
    expect(onIntentionSelect).toHaveBeenCalledWith('ask');
  });

  it('keeps a long paragraph and every choice in one unscrolled region', () => {
    const paragraph = 'Salt '.repeat(1200);
    render(
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Greywake"
        passageTitle="The long watch"
        paragraphs={[paragraph]}
        intentions={[
          { id: 'one', label: 'Hold the lamp' },
          { id: 'two', label: 'Call down the path' },
          { id: 'three', label: 'Check the chain' },
          { id: 'four', label: 'Close the shutter' },
          { id: 'five', label: 'Wait in the doorway' },
          { id: 'six', label: 'Step back inside' },
        ]}
      />,
    );
    const now = document.getElementById('story-frame-now');
    expect(now?.textContent).toContain(paragraph);
    expect(now?.querySelectorAll('button')).toHaveLength(6);
    expect(now?.querySelector('.story-frame__intentions')?.getAttribute('style') ?? '').not.toMatch(/overflow:\s*auto|max-height/);
  });

  it('switches Now and Journal from the hash without choosing an intention', async () => {
    const user = userEvent.setup();
    const onIntentionSelect = vi.fn();
    render(
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Greywake"
        passageTitle="Someone at the door"
        paragraphs={shortParagraphs}
        journalHref="#story-journal"
        journal={<h2>Saved passage</h2>}
        details={<p>Technical details</p>}
        intentions={[{ id: 'ask', label: 'Ask who sent the visitor' }]}
        onIntentionSelect={onIntentionSelect}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Someone at the door' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Saved passage' })).toBeNull();
    expect(screen.getByText('Technical details').closest('details')?.textContent).not.toMatch(/Saved passage/);

    await user.click(screen.getByRole('link', { name: 'Journal' }));
    await act(async () => {
      window.location.hash = '#story-journal';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(screen.getByRole('heading', { name: 'Saved passage' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Someone at the door' })).toBeNull();
    expect(onIntentionSelect).not.toHaveBeenCalled();

    await user.click(screen.getByRole('link', { name: 'Now' }));
    await act(async () => {
      window.location.hash = '#story-frame-now';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(screen.getByRole('heading', { name: 'Someone at the door' })).toBeVisible();
    expect(onIntentionSelect).not.toHaveBeenCalled();
  });
});
