import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoriesHomeActions } from './stories-home-actions';

describe('StoriesHomeActions', () => {
  it('home omits the launch link when disabled', () => {
    const { container } = render(<StoriesHomeActions launchEnabled={false} />);
    expect(
      screen.getByRole('link', { name: 'Create a story' }),
    ).toHaveAttribute('href', '/stories/new');
    expect(
      screen.queryByRole('link', { name: 'Play from a prompt' }),
    ).toBeNull();
    expect(container.innerHTML).not.toContain('/stories/launch');
  });

  it('home keeps create story and adds launch when enabled', () => {
    render(<StoriesHomeActions launchEnabled />);
    expect(
      screen.getByRole('link', { name: 'Create a story' }),
    ).toHaveAttribute('href', '/stories/new');
    expect(
      screen.getByRole('link', { name: 'Play from a prompt' }),
    ).toHaveAttribute('href', '/stories/launch');
  });
});
