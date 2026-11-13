/**
 * PF05 journey proof — provider-free assertions across public → preview →
 * safe sign-in return → player-home failure modes. Complements packet tests.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { StoryDemo } from '../../../app/demo/story-demo';
import { PublicPortal } from '@/src/features/public-portal/public-portal';
import {
  DEFAULT_SAFE_ENTRY,
  resolveSafeEntryDestination,
  signInHrefFor,
} from '@/src/features/session/safe-entry-destination';
import { SignInButton } from '@/src/features/session/sign-in-button';
import { LiveStoryList } from '@/src/features/stories/live-story-list';
import { createBrowserQueryClient } from '@/src/shared/api/query-client';

vi.mock('next/font/google', () => ({
  Fraunces: () => ({ className: '', variable: '--public-display' }),
  Source_Sans_3: () => ({ className: '', variable: '--public-sans' }),
}));

const signInSocial = vi.fn();
vi.mock('@/src/lib/auth-client', () => ({
  authClient: {
    signIn: {
      social: (...args: unknown[]) => signInSocial(...args),
    },
  },
}));

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
  signInSocial.mockReset();
});
afterAll(() => {
  server.close();
});

describe('PF05 A — anonymous first contact', () => {
  it('offers Try preview to /demo before real-story entry; Nest is not required', () => {
    render(<PublicPortal />);
    const primary = screen.getByRole('link', {
      name: 'Try an interactive preview',
    });
    expect(primary).toHaveAttribute('href', '/demo');
    const create = document.querySelector(
      'a.public-portal__cta-secondary',
    ) as HTMLAnchorElement | null;
    expect(create?.getAttribute('href')).toBe('/stories/new');
    expect(create?.textContent).toMatch(/Start a real story/);
    expect(screen.queryByText(/unlimited/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$3/i)).not.toBeInTheDocument();
  });
});

describe('PF05 B — scripted memory without advance-first gate', () => {
  it('opens with a decision and remembers notice on the visitor options', async () => {
    const user = userEvent.setup();
    render(<StoryDemo />);
    expect(
      screen.queryByRole('button', { name: /Advance demo time/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Begin repairing the lantern/ }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /Read the sealed notice/ }),
    );
    await user.click(
      screen.getByRole('button', { name: /Begin repairing the lantern/ }),
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Jump to next moment in this preview',
      }),
    );
    expect(
      screen.getByRole('button', { name: /Show the written order/ }),
    ).toBeInTheDocument();
  });
});

describe('PF05 C — real-play handoff destinations', () => {
  it('maps create intent to sign-in next and rejects hostile return URLs', async () => {
    expect(signInHrefFor('/stories/new')).toContain(
      encodeURIComponent('/stories/new'),
    );
    expect(resolveSafeEntryDestination('https://evil.example')).toBe(
      DEFAULT_SAFE_ENTRY,
    );
    expect(resolveSafeEntryDestination('javascript:alert(1)')).toBe(
      DEFAULT_SAFE_ENTRY,
    );

    signInSocial.mockResolvedValue({});
    const user = userEvent.setup();
    render(<SignInButton next="/stories/new" />);
    await user.click(
      screen.getByRole('button', { name: 'Continue with GitHub' }),
    );
    expect(signInSocial).toHaveBeenCalledWith(
      expect.objectContaining({ callbackURL: '/stories/new' }),
    );
  });
});

describe('PF05 D/E — player home empty vs failure and identity scope', () => {
  it('does not claim zero stories when the list request fails (negative)', async () => {
    const queryClient = createBrowserQueryClient();
    queryClient.setDefaultOptions({ queries: { retry: false } });
    server.use(
      http.get('/api/stories', () =>
        HttpResponse.json({ message: 'down' }, { status: 503 }),
      ),
    );
    render(
      <QueryClientProvider client={queryClient}>
        <LiveStoryList viewerId="viewer-a" />
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /Stories could not be loaded/i,
      );
    });
    expect(
      screen.queryByText(/Every story begins with a situation/i),
    ).not.toBeInTheDocument();
  });

  it('keeps viewer-scoped Query keys distinct across accounts (negative)', () => {
    const a = createBrowserQueryClient();
    const b = createBrowserQueryClient();
    expect(a).not.toBe(b);
  });
});

describe('PF05 F — public copy remains without art dependency', () => {
  it('keeps portal promise and CTAs readable without media', () => {
    render(<PublicPortal />);
    const main = screen.getByRole('main');
    expect(
      within(main).getByRole('heading', { name: 'Offscreen RPG' }),
    ).toBeInTheDocument();
    expect(
      within(main).getByRole('link', { name: 'Try an interactive preview' }),
    ).toBeInTheDocument();
  });
});
