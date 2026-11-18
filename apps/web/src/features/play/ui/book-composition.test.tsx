import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StoryFrame } from './story-frame';

const css = readFileSync(path.join(__dirname, 'story-frame.css'), 'utf8');
const historySource = readFileSync(
  path.join(__dirname, '../history.tsx'),
  'utf8',
);

const options = [
  { id: 'one', label: 'Hold the lamp' },
  { id: 'two', label: 'Call down the path' },
  { id: 'three', label: 'Check the chain' },
  { id: 'four', label: 'Close the shutter' },
  { id: 'five', label: 'Wait in the doorway' },
  { id: 'six', label: 'Step back inside' },
];

describe('book composition (UI03)', () => {
  it('keeps a 6000-character passage and six option ids in one unscrolled leaf', () => {
    const paragraph = 'Salt '.repeat(1200);
    render(
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Greywake"
        passageTitle="The long watch"
        paragraphs={[paragraph]}
        intentions={options}
      />,
    );
    const flow = document.querySelector('.story-frame__narrative-flow');
    expect(flow?.textContent).toContain(paragraph);
    expect(paragraph).toHaveLength(6000);
    expect(
      [...document.querySelectorAll('[data-intention-id]')].map((node) =>
        node.getAttribute('data-intention-id'),
      ),
    ).toEqual(options.map((option) => option.id));
    expect(css).toMatch(
      /\.story-frame__narrative-flow\s*\{[^}]*overflow:\s*visible;[^}]*max-height:\s*none;/,
    );
    expect(css).not.toMatch(/column-count|page-break/);
    expect(document.querySelector('.story-frame__book')).not.toBeNull();
  });

  it('drops the previous story prose on identity switch and does not POST', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { rerender } = render(
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Harbor A"
        paragraphs={['Alpha harbor prose stays on this page only.']}
        intentions={[{ id: 'stay', label: 'Stay at the harbor' }]}
      />,
    );
    rerender(
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Marsh B"
        paragraphs={['Beta marsh prose is the only page now.']}
        intentions={[{ id: 'wade', label: 'Wade the marsh' }]}
      />,
    );
    expect(screen.queryByText(/Alpha harbor prose/)).toBeNull();
    expect(screen.getByText(/Beta marsh prose/)).toBeInTheDocument();
    expect(screen.getByText('Marsh B')).toBeInTheDocument();
    expect(document.querySelector('[data-intention-id="stay"]')).toBeNull();
    expect(document.querySelector('[data-intention-id="wade"]')).not.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('keeps the journal leaf free of current choices and the history reader free of this group', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Greywake"
        paragraphs={['The door is open.']}
        journalHref="#story-journal"
        journal={<h2>Saved passage</h2>}
        intentions={[{ id: 'ask', label: 'Ask who sent the visitor' }]}
      />,
    );
    await act(async () => {
      window.location.hash = '#story-journal';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    const journal = document.getElementById('story-journal');
    expect(journal?.querySelector('[data-intention-id]')).toBeNull();
    expect(journal?.querySelector('button')).toBeNull();
    expect(historySource).not.toMatch(/DecisionGroup|onIntentionSelect/);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    window.location.hash = '';
  });
});
