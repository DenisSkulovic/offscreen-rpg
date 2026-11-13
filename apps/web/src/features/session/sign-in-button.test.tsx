import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const signInSocial = vi.fn();

vi.mock('@/src/lib/auth-client', () => ({
  authClient: {
    signIn: {
      social: (...args: unknown[]) => signInSocial(...args),
    },
  },
}));

import { SignInButton } from './sign-in-button';

describe('SignInButton safe callbackURL', () => {
  beforeEach(() => {
    signInSocial.mockReset();
    signInSocial.mockResolvedValue({});
  });

  it('uses an allowlisted create destination as GitHub callbackURL', async () => {
    const user = userEvent.setup();
    render(<SignInButton next="/stories/new" />);
    await user.click(
      screen.getByRole('button', { name: 'Continue with GitHub' }),
    );
    expect(signInSocial).toHaveBeenCalledWith({
      provider: 'github',
      callbackURL: '/stories/new',
      errorCallbackURL: `/sign-in?error=signin&next=${encodeURIComponent('/stories/new')}`,
    });
  });

  it('falls back to /stories for a hostile next (negative)', async () => {
    const user = userEvent.setup();
    render(<SignInButton next="https://evil.example/phish" />);
    await user.click(
      screen.getByRole('button', { name: 'Continue with GitHub' }),
    );
    expect(signInSocial).toHaveBeenCalledWith(
      expect.objectContaining({
        callbackURL: '/stories',
      }),
    );
  });
});
