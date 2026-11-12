import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { RouteRecoveryPanel } from './route-recovery';

describe('RouteRecoveryPanel', () => {
  it('focuses the retry control and keeps 503 copy distinct from deleted', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { container } = render(
      <RouteRecoveryPanel
        kind="transient"
        resource="story"
        onRetry={onRetry}
      />,
    );

    const retry = screen.getByRole('button', { name: 'Try again' });
    expect(retry).toHaveFocus();
    expect(screen.getByRole('alert').textContent).toMatch(
      /does not send a paid command/i,
    );
    expect(screen.queryByText(/not exist/i)).not.toBeInTheDocument();

    await user.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('offers sign-in for expired sessions without a retry mutation control (negative)', async () => {
    render(<RouteRecoveryPanel kind="unauthorized" resource="story" />);
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveFocus();
    expect(
      screen.queryByRole('button', { name: 'Try again' }),
    ).not.toBeInTheDocument();
  });
});
