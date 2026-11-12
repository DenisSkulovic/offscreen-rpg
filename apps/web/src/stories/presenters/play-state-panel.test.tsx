import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { makeStorySnapshot } from '@/src/test/story-fixtures';
import { PlayStatePanel, playStatusForResolution } from './play-state-panel';
import { ChamberDeniedPanel } from './chamber-denied-panel';
import { RouteRecoveryPanel } from '@/src/features/recovery/route-recovery';

describe('Storybook presenters a11y / semantics', () => {
  it('normal play choice panel has no axe violations', async () => {
    const { container } = render(
      <PlayStatePanel story={makeStorySnapshot()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
    expect(
      screen.getByRole('heading', { name: 'Ashfall Approach' }),
    ).toBeInTheDocument();
  });

  it('uncertain resolution uses status, not a deleted-story message', () => {
    const story = makeStorySnapshot({
      canRespond: false,
      resolution: {
        state: 'uncertain',
        evidence: 'committed',
        version: 1,
      },
      interaction: null,
    });
    render(
      <PlayStatePanel
        story={story}
        statusMessage={playStatusForResolution(story)}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/uncertain/i);
    expect(screen.queryByText(/unavailable/i)).not.toBeInTheDocument();
  });

  it('503 recovery is distinct from 404 (negative)', async () => {
    const { container, rerender } = render(
      <RouteRecoveryPanel
        kind="transient"
        resource="story"
        onRetry={() => {}}
      />,
    );
    expect(screen.getByRole('heading')).toHaveTextContent(/Temporary/i);
    expect(await axe(container)).toHaveNoViolations();

    rerender(<RouteRecoveryPanel kind="not_found" resource="story" />);
    expect(screen.getByRole('heading')).toHaveTextContent(/unavailable/i);
    expect(screen.queryByRole('button', { name: /Try again/i })).toBeNull();
  });

  it('chamber denied panel alerts without private content', async () => {
    const { container } = render(<ChamberDeniedPanel />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Chamber launcher/i);
    expect(container.textContent).not.toMatch(/sk-/);
    expect(await axe(container)).toHaveNoViolations();
  });
});
