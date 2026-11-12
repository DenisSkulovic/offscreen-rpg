import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserQueryClient } from '@/src/shared/api/query-client';
import { fixtureIds } from '@/src/test/story-fixtures';
import { StoryHistoryView } from './history';

const viewerId = 'viewer-history';
const storyA = fixtureIds.storyId;
const storyB = '99999999-9999-4999-8999-999999999999';
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

function renderHistory(storyId: string) {
  const queryClient = createBrowserQueryClient();
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <StoryHistoryView viewerId={viewerId} storyId={storyId} />
      </QueryClientProvider>,
    ),
  };
}

describe('StoryHistoryView useInfiniteQuery', () => {
  it('loads and appends older passages with numeric before', async () => {
    const user = userEvent.setup();
    let calls = 0;
    server.use(
      http.get(`/api/stories/${storyA}/history`, ({ request }) => {
        calls += 1;
        const before = new URL(request.url).searchParams.get('before');
        if (before === null) {
          return HttpResponse.json({
            items: [
              {
                id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                sequence: 4,
                content: {
                  version: 1,
                  title: 'Latest passage',
                  paragraphs: ['Newest.'],
                },
              },
            ],
            nextBefore: 3,
          });
        }
        expect(before).toBe('3');
        return HttpResponse.json({
          items: [
            {
              id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              sequence: 2,
              content: {
                version: 1,
                title: 'Older passage',
                paragraphs: ['Earlier.'],
              },
            },
          ],
          nextBefore: null,
        });
      }),
    );

    renderHistory(storyA);
    await user.click(
      screen.getByRole('button', { name: 'Read saved passages' }),
    );
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: '4. Latest passage' }),
      ).toBeInTheDocument();
    });
    await user.click(
      screen.getByRole('button', { name: 'Read older passages' }),
    );
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: '2. Older passage' }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('heading', { name: '4. Latest passage' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'End of saved passages.',
    );
    expect(calls).toBe(2);
  });

  it('does not show story A chronology after switching to story B (negative)', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`/api/stories/${storyA}/history`, () =>
        HttpResponse.json({
          items: [
            {
              id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
              sequence: 1,
              content: {
                version: 1,
                title: 'Story A only',
                paragraphs: ['A'],
              },
            },
          ],
          nextBefore: null,
        }),
      ),
      http.get(`/api/stories/${storyB}/history`, () =>
        HttpResponse.json({
          items: [
            {
              id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
              sequence: 1,
              content: {
                version: 1,
                title: 'Story B only',
                paragraphs: ['B'],
              },
            },
          ],
          nextBefore: null,
        }),
      ),
    );

    const first = renderHistory(storyA);
    await user.click(
      screen.getByRole('button', { name: 'Read saved passages' }),
    );
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: '1. Story A only' }),
      ).toBeInTheDocument();
    });
    first.unmount();

    renderHistory(storyB);
    expect(
      screen.queryByRole('heading', { name: '1. Story A only' }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Read saved passages' }),
    );
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: '1. Story B only' }),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('heading', { name: '1. Story A only' }),
    ).not.toBeInTheDocument();
  });
});
