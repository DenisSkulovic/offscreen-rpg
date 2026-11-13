import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserQueryClient } from '@/src/shared/api/query-client';
import { queryKeys } from '@/src/shared/api/query-keys';
import { fixtureIds } from '@/src/test/story-fixtures';
import { LiveStoryList } from './live-story-list';

const viewerId = 'viewer-list';
const olderId = '22222222-2222-4222-8222-222222222222';
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

function renderList() {
  const queryClient = createBrowserQueryClient();
  queryClient.setQueryData(queryKeys.storiesList(viewerId), {
    pages: [
      {
        items: [
          {
            id: fixtureIds.storyId,
            title: 'Newest live',
            storyteller: null,
            status: 'active',
          },
        ],
        nextBefore: olderId,
      },
    ],
    pageParams: [null],
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LiveStoryList viewerId={viewerId} />
    </QueryClientProvider>,
  );
}

describe('LiveStoryList useInfiniteQuery', () => {
  it('appends the next page once and shows end-of-list', async () => {
    const user = userEvent.setup();
    let pages = 0;
    server.use(
      http.get('/api/stories', ({ request }) => {
        pages += 1;
        const before = new URL(request.url).searchParams.get('before');
        expect(before).toBe(olderId);
        return HttpResponse.json({
          items: [
            {
              id: olderId,
              title: 'Older live',
              storyteller: null,
              status: 'active',
            },
            {
              id: fixtureIds.storyId,
              title: 'Duplicate ignored',
              storyteller: null,
              status: 'active',
            },
          ],
          nextBefore: null,
        });
      }),
    );

    renderList();
    expect(
      screen.getByRole('heading', { name: 'Newest live' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Enter story' }),
    ).toHaveAttribute('href', `/play/${fixtureIds.storyId}`);
    expect(screen.queryByText(/Continuing/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Older stories' }));
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Older live' }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('heading', { name: 'Newest live' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Duplicate ignored')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'End of live stories.',
    );
    expect(pages).toBe(1);
  });

  it('ignores a rapid second fetchNextPage while the first is in flight (negative)', async () => {
    const user = userEvent.setup();
    let pages = 0;
    server.use(
      http.get('/api/stories', async ({ request }) => {
        pages += 1;
        await delay(80);
        const before = new URL(request.url).searchParams.get('before');
        expect(before).toBe(olderId);
        return HttpResponse.json({
          items: [
            {
              id: olderId,
              title: 'Older live',
              storyteller: null,
              status: 'active',
            },
          ],
          nextBefore: null,
        });
      }),
    );

    renderList();
    const button = screen.getByRole('button', { name: 'Older stories' });
    await user.click(button);
    await user.click(button);
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Older live' }),
      ).toBeInTheDocument();
    });
    expect(pages).toBe(1);
  });
});
