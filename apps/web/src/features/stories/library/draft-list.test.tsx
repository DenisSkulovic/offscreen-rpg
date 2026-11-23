import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserQueryClient } from '@/src/shared/api/query-client';
import { queryKeys } from '@/src/shared/api/query-keys';
import { makeDraft, fixtureDraftId } from '@/src/test/draft-fixtures';
import { DraftList } from './draft-list';

const viewerId = 'viewer-drafts';
const nextCursor = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
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

describe('DraftList useInfiniteQuery', () => {
  it('appends drafts from the opaque cursor page', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/drafts', ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        expect(cursor).toBe(nextCursor);
        return HttpResponse.json({
          items: [makeDraft({ id: nextCursor, title: 'Older draft' })],
          nextCursor: null,
        });
      }),
    );

    const queryClient = createBrowserQueryClient();
    queryClient.setQueryData(queryKeys.draftsList(viewerId), {
      pages: [
        {
          items: [makeDraft({ id: fixtureDraftId, title: 'Newest draft' })],
          nextCursor,
        },
      ],
      pageParams: [null],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <DraftList viewerId={viewerId} />
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole('link', { name: 'Continue creation' }),
    ).toHaveAttribute('href', `/stories/${fixtureDraftId}`);
    expect(screen.queryByText(/Enter story/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'More drafts' }));
    await waitFor(() => {
      expect(screen.getByText('Older draft')).toBeInTheDocument();
    });
    expect(screen.getByText('Newest draft')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('End of drafts.');
  });
});
