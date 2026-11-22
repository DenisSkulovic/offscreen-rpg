import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoriesHomeActions } from './stories-home-actions';

describe('StoriesHomeActions', () => {
  it('exposes one canonical create link without a launch feature gate', () => {
    const { container } = render(<StoriesHomeActions />);
    expect(
      screen.getByRole('link', { name: 'Create a story' }),
    ).toHaveAttribute('href', '/stories/new');
    expect(
      screen.queryByRole('link', { name: 'Play from a prompt' }),
    ).toBeNull();
    expect(container.innerHTML).not.toContain('/stories/launch');
  });
});
