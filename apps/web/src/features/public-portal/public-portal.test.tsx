import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/font/google', () => ({
  Fraunces: () => ({ className: '', variable: '--public-display' }),
  Source_Sans_3: () => ({ className: '', variable: '--public-sans' }),
}));

import { PublicPortal } from './public-portal';

describe('PublicPortal (PF01)', () => {
  it('puts the scripted preview ahead of persistent-story entry', () => {
    render(<PublicPortal />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Offscreen RPG' }),
    ).toBeInTheDocument();

    const primary = screen.getByRole('link', {
      name: 'Try an interactive preview',
    });
    expect(primary).toHaveAttribute('href', '/demo');

    const heroSecondary = document.querySelector(
      '.public-portal__cta-secondary',
    );
    expect(heroSecondary).toBeTruthy();
    expect(heroSecondary).toHaveAttribute('href', '/stories/new');
    expect(heroSecondary).toHaveTextContent('Start a real story');

    expect(
      primary.compareDocumentPosition(heroSecondary!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('exposes working public navigation without dead marketing routes', () => {
    render(<PublicPortal />);
    const nav = screen.getByRole('navigation', { name: 'Public' });

    expect(within(nav).getByRole('link', { name: 'Try preview' })).toHaveAttribute(
      'href',
      '/demo',
    );
    expect(within(nav).getByRole('link', { name: 'Your stories' })).toHaveAttribute(
      'href',
      '/stories',
    );
    expect(within(nav).getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/DenisSkulovic/offscreen-rpg',
    );
    expect(within(nav).getByRole('link', { name: 'How it works' })).toHaveAttribute(
      'href',
      '#how-it-works',
    );

    expect(screen.queryByRole('link', { name: /pricing/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /community/i })).not.toBeInTheDocument();
  });

  it('distinguishes scripted preview from persistent play in plain language', () => {
    render(<PublicPortal />);

    expect(screen.getByRole('heading', { name: 'Scripted preview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Persistent play' })).toBeInTheDocument();
    expect(
      screen.getByText(/no account, no AI calls, resets when you refresh/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/server-owned campaign state/i),
    ).toBeInTheDocument();
  });

  it('labels the hero glimpse as editorial, not live AI play', () => {
    render(<PublicPortal />);
    const glimpse = screen.getByLabelText('Editorial scene glimpse');
    expect(glimpse).toHaveTextContent(/not live play/i);
    expect(
      within(glimpse).getByRole('link', { name: /Continue in the full preview/i }),
    ).toHaveAttribute('href', '/demo');
  });
});
