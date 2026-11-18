import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StoryFrame } from './story-frame';

describe('book contents (UI04)', () => {
  it('keeps a closed menu out of the tab order and returns focus on Escape', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const onIntentionSelect = vi.fn();
    render(
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Greywake"
        paragraphs={['The door is open.']}
        journalHref="#story-journal"
        journal={<h2>Saved passage</h2>}
        intentions={[{ id: 'ask', label: 'Ask who sent the visitor' }]}
        onIntentionSelect={onIntentionSelect}
      />,
    );

    expect(screen.queryByRole('link', { name: 'Journal' })).toBeNull();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Contents' })).toHaveFocus();
    expect(onIntentionSelect).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();

    await user.keyboard('{Enter}');
    expect(screen.getByRole('link', { name: 'Journal' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Contents' })).toHaveFocus();
    expect(screen.queryByRole('link', { name: 'Journal' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Contents' }));
    await user.click(document.body);
    expect(screen.queryByRole('link', { name: 'Journal' })).toBeNull();
    fetchSpy.mockRestore();
  });

  it('opens the journal from a direct hash and drops the previous story journal', () => {
    window.location.hash = '#story-journal';
    const { rerender } = render(
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Harbor A"
        paragraphs={['Alpha harbor prose.']}
        journalHref="#story-journal"
        journal={<h2>Alpha saved page</h2>}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Alpha saved page' }),
    ).toBeVisible();

    rerender(
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Marsh B"
        paragraphs={['Beta marsh prose.']}
        journalHref="#story-journal"
        journal={<h2>Beta saved page</h2>}
      />,
    );
    expect(
      screen.queryByRole('heading', { name: 'Alpha saved page' }),
    ).toBeNull();
    expect(
      screen.getByRole('heading', { name: 'Beta saved page' }),
    ).toBeVisible();
    window.location.hash = '';
  });

  it('does not move focus when the passage changes without a leaf change', () => {
    const { rerender } = render(
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Greywake"
        paragraphs={['First published line.']}
      />,
    );
    screen.getByRole('button', { name: 'Contents' }).focus();
    rerender(
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Greywake"
        paragraphs={['A later published line arrives.']}
      />,
    );
    expect(screen.getByRole('button', { name: 'Contents' })).toHaveFocus();
    expect(
      screen.getByText('A later published line arrives.'),
    ).toBeInTheDocument();
  });
});
