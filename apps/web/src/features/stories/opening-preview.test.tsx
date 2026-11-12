import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserQueryClient } from '@/src/shared/api/query-client';
import { queryKeys } from '@/src/shared/api/query-keys';
import {
  clearStartEnvelope,
  saveStartEnvelope,
  type FrozenStartEnvelope,
} from '@/src/shared/api/start-intent-store';
import { makeDraft, fixtureDraftId } from '@/src/test/draft-fixtures';
import {
  fixtureCandidateId,
  fixtureStartStoryId,
  makeOpeningPreview,
} from '@/src/test/opening-fixtures';
import { makeStorySnapshot } from '@/src/test/story-fixtures';
import { OpeningPreviewPanel } from './opening-preview';

vi.mock('@/src/features/session/session-refresh', () => ({
  SessionRefresh: () => null,
}));

const server = setupServer();
const viewerId = 'viewer-opening';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState(
    null,
    '',
    `/stories/${fixtureDraftId}/preview`,
  );
});

afterEach(() => {
  server.resetHandlers();
  clearStartEnvelope(viewerId, fixtureStartStoryId);
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

function renderPreview(
  preview = makeOpeningPreview(),
  draft = makeDraft(),
) {
  const queryClient = createBrowserQueryClient();
  queryClient.setQueryData(
    queryKeys.draftOpening(viewerId, draft.id),
    preview,
  );
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <OpeningPreviewPanel
          viewerId={viewerId}
          draft={draft}
          initial={preview}
          mechanicalContent={[]}
        />
      </QueryClientProvider>,
    ),
  };
}

function frozenStart(
  overrides: Partial<FrozenStartEnvelope> = {},
): FrozenStartEnvelope {
  return {
    version: 1,
    kind: 'start',
    viewerId,
    draftId: fixtureDraftId,
    storyId: fixtureStartStoryId,
    candidateId: fixtureCandidateId,
    expectedDraftRevision: 1,
    campaign: {
      mechanics: false,
      locked: false,
      pace: { kind: 'rate', fictionalSeconds: 1, realSeconds: 1 },
    },
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('OpeningPreviewPanel Start recovery', () => {
  it('starts with a frozen campaign body and navigates on success', async () => {
    const user = userEvent.setup();
    const assign = vi
      .spyOn(window.location, 'assign')
      .mockImplementation(() => undefined);
    let putBody: unknown;
    server.use(
      http.put(`/api/stories/:storyId/start`, async ({ request }) => {
        putBody = await request.json();
        return HttpResponse.json(makeStorySnapshot());
      }),
    );

    renderPreview();
    await user.click(screen.getByRole('checkbox'));
    await user.selectOptions(screen.getByLabelText(/Game speed/i), 'fast');
    await user.click(screen.getByRole('button', { name: 'Start story' }));

    await waitFor(() => {
      expect(putBody).toMatchObject({
        candidateId: fixtureCandidateId,
        expectedDraftRevision: 1,
        campaign: {
          mechanics: false,
          locked: true,
          pace: { kind: 'rate', fictionalSeconds: 10, realSeconds: 1 },
        },
      });
    });
    await waitFor(() => {
      expect(assign).toHaveBeenCalled();
    });
  });

  it('GET-first remount recovers a committed story without auto Start PUT (negative)', async () => {
    const assign = vi
      .spyOn(window.location, 'assign')
      .mockImplementation(() => undefined);
    let puts = 0;
    let gets = 0;
    saveStartEnvelope(frozenStart());
    window.history.replaceState(
      null,
      '',
      `/stories/${fixtureDraftId}/preview?story=${fixtureStartStoryId}`,
    );
    server.use(
      http.get(`/api/stories/${fixtureStartStoryId}`, () => {
        gets += 1;
        return HttpResponse.json(makeStorySnapshot({ id: fixtureStartStoryId }));
      }),
      http.put(`/api/stories/${fixtureStartStoryId}/start`, () => {
        puts += 1;
        return HttpResponse.json(makeStorySnapshot({ id: fixtureStartStoryId }));
      }),
    );

    renderPreview();
    await waitFor(() => {
      expect(gets).toBeGreaterThan(0);
    });
    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith(`/play/${fixtureStartStoryId}`);
    });
    expect(puts).toBe(0);
  });

  it('keeps the frozen Start body when pace changes after uncertain ACK (negative)', async () => {
    const user = userEvent.setup();
    const putBodies: unknown[] = [];
    server.use(
      http.put(`/api/stories/:storyId/start`, async ({ request }) => {
        putBodies.push(await request.json());
        await delay(20);
        return HttpResponse.error();
      }),
    );

    renderPreview();
    await user.selectOptions(screen.getByLabelText(/Game speed/i), 'fast');
    await user.click(screen.getByRole('button', { name: 'Start story' }));
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Retry the same Start' }),
      ).toBeInTheDocument();
    });
    expect(putBodies).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Retry the same Start' }));
    await waitFor(() => {
      expect(putBodies).toHaveLength(2);
    });
    expect(putBodies[0]).toEqual(putBodies[1]);
    expect(putBodies[0]).toMatchObject({
      campaign: {
        pace: { kind: 'rate', fictionalSeconds: 10, realSeconds: 1 },
      },
    });
  });

  it('blocks retry when session capture is missing for a story anchor (negative)', async () => {
    window.history.replaceState(
      null,
      '',
      `/stories/${fixtureDraftId}/preview?story=${fixtureStartStoryId}`,
    );
    server.use(
      http.get(`/api/stories/${fixtureStartStoryId}`, () =>
        HttpResponse.json({ error: 'missing' }, { status: 404 }),
      ),
    );

    renderPreview();
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        /no recoverable Start body/i,
      );
    });
    expect(
      screen.queryByRole('button', { name: 'Retry the same Start' }),
    ).not.toBeInTheDocument();
  });

  it('does not PUT generation on mount while a pending opening refreshes (negative)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const pending = makeOpeningPreview({ state: 'pending' });
    let puts = 0;
    let gets = 0;
    server.use(
      http.put(`/api/drafts/${fixtureDraftId}/openings/:id`, () => {
        puts += 1;
        return HttpResponse.json(pending, { status: 202 });
      }),
      http.get(`/api/drafts/${fixtureDraftId}/openings/latest`, () => {
        gets += 1;
        return HttpResponse.json({ preview: pending });
      }),
    );

    try {
      const queryClient = createBrowserQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <OpeningPreviewPanel
            viewerId={viewerId}
            draft={makeDraft()}
            initial={pending}
            mechanicalContent={[]}
          />
        </QueryClientProvider>,
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4500);
      });
      expect(puts).toBe(0);
      expect(gets).toBeGreaterThan(0);
      expect(screen.getByText(/Opening queued/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
