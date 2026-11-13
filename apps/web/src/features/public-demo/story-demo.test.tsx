import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { StoryDemo } from '../../../app/demo/story-demo';

function stage() {
  return within(screen.getByRole('main'));
}

function intention(name: RegExp) {
  return screen.getByRole('button', { name });
}

describe('StoryDemo Greywake walkthrough', () => {
  it('offers a first decision immediately and supports notice then repair branch', async () => {
    const user = userEvent.setup();
    render(<StoryDemo />);

    expect(intention(/Begin repairing the lantern/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: /Jump to next moment|Advance demo time|Preview returning/,
      }),
    ).not.toBeInTheDocument();

    await user.click(intention(/Read the sealed notice/));
    expect(
      stage().getByText(/Do not light the lantern until the evening patrol/),
    ).toBeInTheDocument();
    expect(intention(/Leave the mechanism untouched/)).toBeInTheDocument();

    await user.click(intention(/Begin repairing the lantern/));
    await user.click(
      screen.getByRole('button', {
        name: 'Jump to next moment in this preview',
      }),
    );
    expect(intention(/Show the written order/)).toBeInTheDocument();
    expect(stage().getByText(/held at three of nine/i)).toBeInTheDocument();

    await user.click(intention(/Show the written order/));
    await user.click(
      screen.getByRole('button', { name: 'Preview returning later' }),
    );

    expect(
      screen.getByRole('link', { name: 'Create a persistent story' }),
    ).toHaveAttribute('href', '/stories/new');
    expect(
      screen.getByRole('button', { name: 'Replay preview' }),
    ).toBeInTheDocument();
    expect(stage().getByText(/Repair reached 3\/9/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Replay preview' }));
    expect(intention(/Read the sealed notice/)).toBeInTheDocument();
  });

  it('blocks local actions while paused but keeps create navigation', async () => {
    const user = userEvent.setup();
    render(<StoryDemo />);

    await user.click(screen.getByRole('button', { name: 'Pause preview' }));
    await user.click(intention(/Begin repairing the lantern/));
    expect(intention(/Begin repairing the lantern/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Create a persistent story' }),
    ).toHaveAttribute('href', '/stories/new');
  });

  it('omits fabricated progress on the untouched path', async () => {
    const user = userEvent.setup();
    render(<StoryDemo />);

    await user.click(intention(/Read the sealed notice/));
    await user.click(intention(/Leave the mechanism untouched/));
    expect(intention(/Show the written order/)).toBeInTheDocument();
    expect(
      stage().getByText(/no interrupted progress/i),
    ).toBeInTheDocument();

    await user.click(intention(/Ask why the lantern should stay dark/));
    await user.click(
      screen.getByRole('button', { name: 'Preview returning later' }),
    );
    expect(
      stage().getByText(/No repair work was completed/i),
    ).toBeInTheDocument();
    expect(
      stage().queryByText(/Repair reached 3\/9/i),
    ).not.toBeInTheDocument();
  });
});
