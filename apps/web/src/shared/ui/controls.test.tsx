import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Action } from './action';
import { SystemNotice } from './system-notice';

describe('shared Action and SystemNotice', () => {
  it('renders navigation as a link and does not POST', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(
      <Action kind="link" variant="quiet" href="/stories">
        Back to stories
      </Action>,
    );
    const link = screen.getByRole('link', { name: 'Back to stories' });
    expect(link).toHaveAttribute('href', '/stories');
    expect(screen.queryByRole('button')).toBeNull();
    await user.click(link);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('keeps a luminous disabled action disabled and activates Enter and Space once each', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <>
        <Action
          kind="button"
          variant="primary"
          disabled
          data-surface="luminous"
          onClick={onClick}
        >
          Hold
        </Action>
        <Action kind="button" variant="critical" onClick={onClick}>
          Send
        </Action>
      </>,
    );
    const held = screen.getByRole('button', { name: 'Hold' });
    expect(held).toBeDisabled();
    expect(held).toHaveAttribute('data-surface', 'luminous');
    await user.click(held);
    await user.keyboard('{Enter}');
    expect(onClick).not.toHaveBeenCalled();

    const send = screen.getByRole('button', { name: 'Send' });
    send.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('marks pending without a progress animation role', () => {
    render(
      <Action kind="button" pending>
        Starting story…
      </Action>,
    );
    const button = screen.getByRole('button', { name: 'Starting story…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('uses a live region only for attention, success, and error', () => {
    const { rerender } = render(
      <SystemNotice tone="neutral">The book is quiet.</SystemNotice>,
    );
    expect(screen.getByText('The book is quiet.')).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();

    rerender(
      <SystemNotice tone="attention">
        Still checking the saved request.
      </SystemNotice>,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Still checking the saved request.',
    );

    rerender(
      <SystemNotice tone="error">The opening was not created.</SystemNotice>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The opening was not created.',
    );
  });
});
