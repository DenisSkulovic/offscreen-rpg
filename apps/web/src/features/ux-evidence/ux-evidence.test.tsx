import { render, screen, waitFor } from '@testing-library/react';
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
import { axe } from 'vitest-axe';
import { StoryDemo } from '../../../app/demo/story-demo';
import { PublicPortal } from '@/src/features/public-portal/public-portal';
import { StoryFrame } from '@/src/features/play/ui/story-frame';
import { LiveStoryList } from '@/src/features/stories/live-story-list';
import { createBrowserQueryClient } from '@/src/shared/api/query-client';

vi.mock('next/font/google', () => ({
  Fraunces: () => ({ className: '', variable: '--public-display' }),
  Source_Sans_3: () => ({ className: '', variable: '--public-sans' }),
}));

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

describe('UX11 visual/a11y evidence (shipped surfaces)', () => {
  it('keeps the public portal free of critical axe violations', async () => {
    const { container } = render(<PublicPortal />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('keeps StoryFrame decision and quiet states axe-clean', async () => {
    const decision = render(
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Greywake"
        statusLabel="Waiting for your choice"
        paragraphs={['Someone waits at the stair.']}
        intentions={[
          { id: 'ask', label: 'Ask why', support: 'Brief' },
          { id: 'leave', label: 'Withdraw', support: 'Safe exit' },
        ]}
      />,
    );
    expect(await axe(decision.container)).toHaveNoViolations();
    decision.unmount();

    const quiet = render(
      <StoryFrame
        storiesHref="/stories"
        storyLabel="Current passage"
        paragraphs={['Nothing requires you to act immediately.']}
      />,
    );
    expect(await axe(quiet.container)).toHaveNoViolations();
  });

  it('opens the scripted preview with a choice (no advance-first gate)', () => {
    render(<StoryDemo />);
    expect(
      screen.getByRole('button', { name: /Begin repairing the lantern/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Advance demo time/i }),
    ).not.toBeInTheDocument();
  });

  it('rejects the false empty-library state when stories fail (counterexample)', async () => {
    const queryClient = createBrowserQueryClient();
    queryClient.setDefaultOptions({ queries: { retry: false } });
    server.use(
      http.get('/api/stories', () =>
        HttpResponse.json({ message: 'down' }, { status: 503 }),
      ),
    );
    render(
      <QueryClientProvider client={queryClient}>
        <LiveStoryList viewerId="ux11-viewer" />
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
});
