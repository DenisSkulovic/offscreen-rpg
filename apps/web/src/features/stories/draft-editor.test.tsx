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
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserQueryClient } from '@/src/shared/api/query-client';
import { queryKeys } from '@/src/shared/api/query-keys';
import { fixtureDraftId, makeDraft } from '@/src/test/draft-fixtures';
import { DraftEditor } from './draft-editor';

vi.mock('@/src/features/session/session-refresh', () => ({
  SessionRefresh: () => null,
}));

vi.mock('./storyteller-select', () => ({
  StorytellerSelect: ({
    value,
    onChange,
  }: {
    value: { id: string; revision: number } | null;
    onChange: (next: { id: string; revision: number } | null) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange({ id: 'chronicler', revision: 1 })}
    >
      {value ? `Selected ${value.id}` : 'Pick storyteller'}
    </button>
  ),
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

function renderEditor(draft = makeDraft(), viewerId = 'viewer-draft') {
  const queryClient = createBrowserQueryClient();
  queryClient.setQueryData(queryKeys.draft(viewerId, draft.id), draft);
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <DraftEditor
          viewerId={viewerId}
          id={draft.id}
          initial={draft}
          preparedStarts={[]}
        />
      </QueryClientProvider>,
    ),
  };
}

describe('DraftEditor RHF lifecycle', () => {
  it('saves a dirty draft and advances the revision baseline', async () => {
    const user = userEvent.setup();
    const initial = makeDraft({ revision: 1, premise: 'Original premise.' });
    const saved = makeDraft({
      revision: 2,
      premise: 'Edited premise for the gate.',
    });
    let putBody: unknown;
    server.use(
      http.put(`/api/drafts/${fixtureDraftId}`, async ({ request }) => {
        putBody = await request.json();
        await delay(20);
        return HttpResponse.json(saved);
      }),
    );

    renderEditor(initial);
    await user.click(screen.getByRole('button', { name: 'Edit setup' }));
    await user.click(screen.getByRole('button', { name: /Back/i }));
    const premise = screen.getByLabelText(
      /World, character and starting circumstances|Your prisoner/i,
    );
    await user.clear(premise);
    await user.type(premise, 'Edited premise for the gate.');
    await user.click(
      screen.getByRole('button', { name: 'Continue to Storyteller' }),
    );
    await user.click(screen.getByRole('button', { name: 'Review setup' }));
    await user.click(screen.getByRole('button', { name: 'Save setup' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/Setup saved/i);
    });
    expect(putBody).toMatchObject({
      expectedRevision: 1,
      premise: 'Edited premise for the gate.',
    });
    expect(
      screen.getByRole('link', { name: 'Create the opening' }),
    ).toBeInTheDocument();
  });

  it('keeps dirty values after 409 and only adopts on explicit load (negative)', async () => {
    const user = userEvent.setup();
    const initial = makeDraft({
      revision: 1,
      premise: 'Baseline premise.',
      title: 'Local title',
    });
    const serverDraft = makeDraft({
      revision: 3,
      premise: 'Server premise from other tab.',
      title: 'Server title',
    });
    server.use(
      http.put(`/api/drafts/${fixtureDraftId}`, () =>
        HttpResponse.json({ error: 'conflict' }, { status: 409 }),
      ),
      http.get(`/api/drafts/${fixtureDraftId}`, () =>
        HttpResponse.json(serverDraft),
      ),
    );

    renderEditor(initial);
    await user.click(screen.getByRole('button', { name: 'Edit setup' }));
    await user.click(screen.getByRole('button', { name: /Back/i }));
    const premise = screen.getByLabelText(
      /World, character and starting circumstances|Your prisoner/i,
    );
    await user.clear(premise);
    await user.type(premise, 'Conflict-local unsaved premise.');
    await user.click(
      screen.getByRole('button', { name: 'Continue to Storyteller' }),
    );
    await user.click(screen.getByRole('button', { name: 'Review setup' }));
    await user.click(screen.getByRole('button', { name: 'Save setup' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/changed elsewhere/i);
    });
    expect(
      screen.getByText('Conflict-local unsaved premise.'),
    ).toBeInTheDocument();

    window.confirm = vi.fn(() => true);
    await user.click(screen.getByRole('button', { name: 'Load saved setup' }));
    await waitFor(() => {
      expect(
        screen.getByText('Server premise from other tab.'),
      ).toBeInTheDocument();
    });
    expect(screen.getByText('Server title')).toBeInTheDocument();
  });

  it('does not let a late save response overwrite newer keystrokes (negative)', async () => {
    const user = userEvent.setup();
    const initial = makeDraft({ revision: 1, premise: 'Start premise.' });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.put(`/api/drafts/${fixtureDraftId}`, async () => {
        await gate;
        return HttpResponse.json(
          makeDraft({ revision: 2, premise: 'Frozen save premise.' }),
        );
      }),
    );

    renderEditor(initial);
    await user.click(screen.getByRole('button', { name: 'Edit setup' }));
    await user.click(screen.getByRole('button', { name: /Back/i }));
    const premise = screen.getByLabelText(
      /World, character and starting circumstances|Your prisoner/i,
    );
    await user.clear(premise);
    await user.type(premise, 'Frozen save premise.');
    await user.click(
      screen.getByRole('button', { name: 'Continue to Storyteller' }),
    );
    await user.click(screen.getByRole('button', { name: 'Review setup' }));
    await user.click(screen.getByRole('button', { name: 'Save setup' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    });

    await user.click(screen.getByRole('button', { name: 'Edit setup' }));
    await user.click(screen.getByRole('button', { name: /Back/i }));
    const premiseAgain = screen.getByLabelText(
      /World, character and starting circumstances|Your prisoner/i,
    );
    await user.clear(premiseAgain);
    await user.type(premiseAgain, 'Typed after submit.');

    await act(async () => {
      release();
    });
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/Setup saved/i);
    });
    expect(
      screen.getByLabelText(
        /World, character and starting circumstances|Your prisoner/i,
      ),
    ).toHaveValue('Typed after submit.');
  });

  it('ignores background Query updates while the form is dirty (negative)', async () => {
    const user = userEvent.setup();
    const initial = makeDraft({
      revision: 1,
      premise: 'Editing this text.',
      title: 'Local',
    });
    const { queryClient } = renderEditor(initial);

    await user.click(screen.getByRole('button', { name: 'Edit setup' }));
    await user.click(screen.getByRole('button', { name: /Back/i }));
    const premise = screen.getByLabelText(
      /World, character and starting circumstances|Your prisoner/i,
    );
    await user.clear(premise);
    await user.type(premise, 'Dirty local premise.');

    act(() => {
      queryClient.setQueryData(
        queryKeys.draft('viewer-draft', fixtureDraftId),
        makeDraft({
          revision: 9,
          premise: 'Background refetch must not win.',
          title: 'Refetch title',
        }),
      );
    });

    expect(premise).toHaveValue('Dirty local premise.');
    expect(
      screen.queryByDisplayValue('Background refetch must not win.'),
    ).not.toBeInTheDocument();
  });
});
