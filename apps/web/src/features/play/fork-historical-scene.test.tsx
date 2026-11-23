import { http, HttpResponse } from 'msw';
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
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { historicalSceneSchema } from '@offscreen/story-interface/stories';
import { createBrowserQueryClient } from '@/src/shared/api/query-client';
import { makeCampaign } from '@/src/test/campaign-fixtures';
import { fixtureIds } from '@/src/test/story-fixtures';
import { StoryHistoryView } from './history';
import { createHash } from 'node:crypto';
import { historicalForkStoryId } from './historical-fork-story-id';

function historicalForkStoryIdSync(sourceStoryId: string, sequence: number) {
  const bytes = createHash('sha256')
    .update(`offscreen:fork-story:${sourceStoryId}:${sequence}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const viewerId = 'viewer-fork-history';
const storyId = fixtureIds.storyId;
const passage37 = '77777777-7777-4777-8777-777777777777';
const passage80 = '88888888-8888-4888-8888-888888888888';
const choice37Label = 'Hail the harbormaster';
const commitment37Label = 'Ten-hour passage east';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

beforeEach(() => {
  push.mockReset();
  server.use(
    http.get(/\/api\/stories\/[^/]+\/scenes\/\d+$/, () =>
      HttpResponse.json({ code: 'not_found' }, { status: 404 }),
    ),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function makeScene37Historical() {
  const campaign = makeCampaign({ activity: 'running-contribution' });
  return historicalSceneSchema.parse({
    id: storyId,
    revision: 80,
    viewVersion: 3,
    canRespond: false,
    items: [{ key: 'lantern', label: 'Salt lantern', holderKey: 'player' }],
    decision: null,
    waiting: null,
    lineage: null,
    campaign: {
      ...campaign,
      commitments: [
        {
          id: '99999999-9999-4999-8999-999999999991',
          label: commitment37Label,
          state: 'running',
          boundariesSettled: 0,
          revision: 1,
          completionPending: false,
          progress: {
            kind: 'contribution',
            label: 'Hours under sail',
            earned: 2,
            required: 10,
          },
          dueAt: '2026-11-13T12:00:00.000Z',
          estimatedCompletionAt: '2026-11-13T22:00:00.000Z',
          resolvedGameSeconds: 0,
          settingsRevision: 1,
        },
      ],
    },
    current: {
      id: passage37,
      content: {
        version: 1,
        title: 'Quay at dusk',
        paragraphs: ['You stand on the quay at dusk while rigging groans.'],
      },
      interaction: {
        id: fixtureIds.interactionId,
        specification: {
          kind: 'choice.v1',
          prompt: 'What now?',
          options: [{ id: 'hail', label: choice37Label }],
        },
      },
    },
    resolution: null,
    asOfSequence: 37,
    checkpointHash: 'a'.repeat(64),
    canon: { rootHash: null, rootRevision: 0 },
  });
}

function renderHistory() {
  const queryClient = createBrowserQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <StoryHistoryView viewerId={viewerId} storyId={storyId} />
    </QueryClientProvider>,
  );
}

describe('historical scene fork panel', () => {
  it('forks scene 37 without leaking scene 80 and navigates once', async () => {
    const user = userEvent.setup();
    const stableId = historicalForkStoryIdSync(storyId, 37);
    expect(await historicalForkStoryId(storyId, 37)).toBe(stableId);

    let putCalls = 0;
    server.use(
      http.get(`/api/stories/${storyId}/history`, () =>
        HttpResponse.json({
          items: [
            {
              id: passage80,
              sequence: 80,
              content: {
                version: 1,
                title: 'Later bell',
                paragraphs: ['The later bell echoes across the bay.'],
              },
            },
            {
              id: passage37,
              sequence: 37,
              content: {
                version: 1,
                title: 'Quay at dusk',
                paragraphs: ['You stand on the quay at dusk while rigging groans.'],
              },
            },
          ],
          nextBefore: null,
        }),
      ),
      http.get(`/api/stories/${storyId}/scenes/37`, () =>
        HttpResponse.json(makeScene37Historical()),
      ),
      http.get(`/api/stories/${storyId}/scenes/80`, () =>
        HttpResponse.json({
          ...makeScene37Historical(),
          asOfSequence: 80,
          current: {
            id: passage80,
            content: {
              version: 1,
              title: 'Later bell',
              paragraphs: ['The later bell echoes across the bay.'],
            },
            interaction: null,
          },
        }),
      ),
      http.put(`/api/stories/${storyId}/forks/${stableId}`, async ({ request }) => {
        putCalls += 1;
        const body = (await request.json()) as {
          expectedRevision: number;
          sourcePassageId?: string;
        };
        expect(body.expectedRevision).toBe(37);
        expect(body.sourcePassageId).toBe(passage37);
        return HttpResponse.json({
          id: stableId,
          revision: 1,
          viewVersion: 1,
          canRespond: true,
          items: [],
          decision: null,
          waiting: null,
          lineage: {
            sourceStoryId: storyId,
            sourcePassageId: passage37,
            sourceSequence: 37,
          },
          current: {
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            content: {
              version: 1,
              title: 'Child opening',
              paragraphs: ['The fork begins.'],
            },
            interaction: null,
          },
          resolution: null,
        });
      }),
    );

    renderHistory();
    await user.click(screen.getByRole('button', { name: 'Read saved passages' }));
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /37\. Quay at dusk/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /80\. Later bell/ }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /37\. Quay at dusk/ }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '37. Quay at dusk' })).toBeInTheDocument();
    });

    const forkPanel = await screen.findByTestId('historical-fork-panel');
    expect(within(forkPanel).getByText(choice37Label)).toBeInTheDocument();
    expect(within(forkPanel).getByText(commitment37Label)).toBeInTheDocument();
    expect(within(forkPanel).queryByText(/later bell/i)).not.toBeInTheDocument();

    const forkButton = within(forkPanel).getByRole('button', {
      name: 'Fork from this scene',
    });
    await waitFor(() => {
      expect(forkButton).toBeEnabled();
    });

    await user.click(forkButton);
    await waitFor(() => {
      expect(putCalls).toBe(1);
      expect(push).toHaveBeenCalledWith(`/play/${stableId}`);
    });

    await user.click(forkButton);
    expect(putCalls).toBe(1);
  });

  it('does not offer a fork when the historical scene request fails', async () => {
    const user = userEvent.setup();
    let putCalls = 0;
    server.use(
      http.get(`/api/stories/${storyId}/history`, () =>
        HttpResponse.json({
          items: [
            {
              id: passage37,
              sequence: 37,
              content: {
                version: 1,
                title: 'Quay at dusk',
                paragraphs: ['You stand on the quay at dusk.'],
              },
            },
          ],
          nextBefore: null,
        }),
      ),
      http.get(`/api/stories/${storyId}/scenes/37`, () =>
        HttpResponse.json({ code: 'not_found' }, { status: 404 }),
      ),
      http.put(`/api/stories/${storyId}/forks/${historicalForkStoryIdSync(storyId, 37)}`, () => {
        putCalls += 1;
        return HttpResponse.json({});
      }),
    );

    renderHistory();
    await user.click(screen.getByRole('button', { name: 'Read saved passages' }));
    await user.click(screen.getByRole('button', { name: /37\. Quay at dusk/ }));
    await waitFor(() => {
      expect(
        screen.getByText(/not an independent fork point/i),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: 'Fork from this scene' }),
    ).not.toBeInTheDocument();
    expect(putCalls).toBe(0);
  });
});