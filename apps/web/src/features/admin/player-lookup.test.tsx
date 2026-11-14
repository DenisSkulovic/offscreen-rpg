import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AdminSelfV1 } from '@offscreen/contracts/admin';
import { AdminPlayerLookup } from './player-lookup';

const self: AdminSelfV1 = {
  version: 1,
  staffPrincipalId: '11111111-1111-4111-8111-111111111111',
  status: 'active',
  accessEpoch: 1,
  sessionExpiresAt: '2030-01-01T00:00:00.000Z',
  idleExpiresAt: '2030-01-01T00:30:00.000Z',
  workspaceFamilies: ['player'],
};

function renderLookup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AdminPlayerLookup self={self} />
    </QueryClientProvider>,
  );
}

describe('AdminPlayerLookup', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/admin/players?ref=allowed')) {
          return Response.json({
            version: 1,
            items: [
              {
                id: 'allowed',
                createdAt: '2026-01-01T00:00:00.000Z',
                status: 'unknown',
              },
            ],
            limit: 1,
            nextCursor: null,
          });
        }
        if (url.includes('/api/admin/players/allowed')) {
          return Response.json({
            version: 1,
            subject: {
              kind: 'player',
              id: 'allowed',
              environment: 'local',
            },
            data: {
              id: 'allowed',
              createdAt: '2026-01-01T00:00:00.000Z',
              status: 'unknown',
              relationshipSummary: {
                legacyOwnedCampaignCount: 0,
                coverage: 'complete',
              },
              commercial: {
                status: 'unsupported',
                explanationCode: 'no-commercial-source',
              },
            },
            observedAt: '2026-11-14T12:00:00.000Z',
            consistency: 'verified',
            sources: [{ kind: 'auth.user', coverage: 'complete' }],
            limitations: ['unsupported'],
          });
        }
        if (url.includes('/api/admin/players?ref=secret')) {
          return Response.json({
            version: 1,
            items: [],
            limit: 1,
            nextCursor: null,
          });
        }
        return new Response(null, { status: 500 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows authorized summary and empty-match copy without leaking secrets', async () => {
    const user = userEvent.setup();
    renderLookup();
    await user.type(screen.getByLabelText(/player reference/i), 'allowed');
    await user.click(screen.getByRole('button', { name: /look up/i }));
    await waitFor(() => {
      expect(screen.getByText(/Player allowed/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/unsupported/i)).toBeInTheDocument();
    expect(screen.queryByText(/access_token/i)).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText(/player reference/i));
    await user.type(screen.getByLabelText(/player reference/i), 'secret');
    await user.click(screen.getByRole('button', { name: /look up/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/No authorized match for that reference/i),
      ).toBeInTheDocument();
    });
  });
});
