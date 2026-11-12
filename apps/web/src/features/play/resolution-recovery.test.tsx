import { http, HttpResponse, delay } from 'msw';
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
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResolutionRecovery } from './resolution-recovery';
import { makeStorySnapshot, fixtureIds } from '@/src/test/story-fixtures';

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

describe('ResolutionRecovery', () => {
  it('refreshes the saved scene after a deferred GET (normal)', async () => {
    const user = userEvent.setup();
    const onSnapshot = vi.fn();
    const pending = makeStorySnapshot({
      canRespond: false,
      resolution: {
        state: 'uncertain',
        evidence: 'committed',
        version: 1,
        canRetry: false,
        blocker: { kind: 'usage-uncertain', recovery: 'refresh' },
      },
      interaction: null,
    });
    const refreshed = makeStorySnapshot({
      viewVersion: 9,
      title: 'Reconciled scene',
      canRespond: true,
      resolution: null,
    });

    server.use(
      http.get(`/api/stories/${fixtureIds.storyId}`, async () => {
        await delay(40);
        return HttpResponse.json(refreshed);
      }),
    );

    render(<ResolutionRecovery story={pending} onSnapshot={onSnapshot} />);

    await user.click(
      screen.getByRole('button', { name: 'Refresh saved state' }),
    );

    await waitFor(() => {
      expect(onSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({
          viewVersion: 9,
          current: expect.objectContaining({
            content: expect.objectContaining({ title: 'Reconciled scene' }),
          }),
        }),
      );
    });
    expect(
      screen.queryByText(/Could not confirm the request/i),
    ).not.toBeInTheDocument();
  });

  it('shows recovery status when refresh fails (negative transport)', async () => {
    const user = userEvent.setup();
    const onSnapshot = vi.fn();
    const pending = makeStorySnapshot({
      canRespond: false,
      resolution: {
        state: 'failed',
        evidence: 'committed',
        version: 1,
        canRetry: true,
        blocker: { kind: 'generation', recovery: 'retry' },
      },
      interaction: null,
    });

    server.use(
      http.get(`/api/stories/${fixtureIds.storyId}`, () =>
        HttpResponse.json({ error: 'Unavailable' }, { status: 503 }),
      ),
    );

    render(<ResolutionRecovery story={pending} onSnapshot={onSnapshot} />);
    await user.click(
      screen.getByRole('button', { name: 'Refresh saved state' }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      /Could not confirm the request/i,
    );
    expect(onSnapshot).not.toHaveBeenCalled();
  });
});
