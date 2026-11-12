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
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserQueryClient } from '@/src/shared/api/query-client';
import { fixtureIds, makeStorySnapshot } from '@/src/test/story-fixtures';

vi.mock('@/src/features/session/session-refresh', () => ({
  SessionRefresh: () => null,
}));
vi.mock('./history', () => ({
  StoryHistoryView: () => null,
}));
vi.mock('./campaign-settings', () => ({
  CampaignSettingsEditor: () => null,
}));
vi.mock('./campaign-play', () => ({
  CampaignPlay: () => null,
}));
vi.mock('@/src/shared/api/story-update-stream', () => ({
  openStoryUpdateStream: () => ({ close() {} }),
  setStoryUpdateEventSourceFactoryForTests: () => undefined,
}));

import { PlayScene } from './view';

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  sessionStorage.clear();
});

afterAll(() => {
  server.close();
});

function renderBarePlay() {
  const queryClient = createBrowserQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <PlayScene viewerId="viewer-test" storyId={fixtureIds.storyId} />
    </QueryClientProvider>,
  );
}

describe('PlayScene initial read recovery', () => {
  it('shows transient recovery for 503 without treating the story as deleted (negative)', async () => {
    const user = userEvent.setup();
    let gets = 0;
    let puts = 0;
    let allowSuccess = false;
    server.use(
      http.get(`/api/stories/${fixtureIds.storyId}`, () => {
        gets += 1;
        if (!allowSuccess) {
          return HttpResponse.json({ error: 'Unavailable' }, { status: 503 });
        }
        return HttpResponse.json(
          makeStorySnapshot({ title: 'Recovered scene' }),
        );
      }),
      http.put(`/api/stories/${fixtureIds.storyId}/*`, () => {
        puts += 1;
        return new HttpResponse(null, { status: 500 });
      }),
    );

    renderBarePlay();
    await waitFor(
      () => {
        expect(
          screen.getByRole('heading', { name: 'Temporary interruption' }),
        ).toBeInTheDocument();
      },
      { timeout: 4000 },
    );
    expect(screen.queryByText(/not exist/i)).not.toBeInTheDocument();

    allowSuccess = true;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Recovered scene' }),
      ).toBeInTheDocument();
    });
    expect(puts).toBe(0);
    expect(gets).toBeGreaterThanOrEqual(2);
  });

  it('shows sign-in for 401 and never auto-dispatches a command (negative)', async () => {
    let puts = 0;
    server.use(
      http.get(`/api/stories/${fixtureIds.storyId}`, () =>
        HttpResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      ),
      http.put(`/api/stories/${fixtureIds.storyId}/*`, () => {
        puts += 1;
        return new HttpResponse(null, { status: 500 });
      }),
    );

    renderBarePlay();
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Sign in required' }),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(puts).toBe(0);
  });
});
