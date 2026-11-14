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
        if (url.includes('/api/admin/players/allowed/campaigns')) {
          return Response.json({
            version: 1,
            playerId: 'allowed',
            items: [
              {
                id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
                relation: 'legacy-owner',
                createdAt: '2026-01-01T00:00:00.000Z',
                currentRevision: 2,
                viewVersion: 3,
                operationHealth: 'pending',
              },
            ],
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
                legacyOwnedCampaignCount: 1,
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
        if (
          url.includes(
            '/api/admin/campaigns/cccccccc-cccc-4ccc-8ccc-cccccccccccc/operations',
          )
        ) {
          return Response.json({
            version: 1,
            campaignId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            items: [
              {
                id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
                kind: 'storyteller.action.v1',
                state: 'failed',
                publication: 'unknown',
                sourceCoverage: 'since-enabled',
                lastObservedAt: '2026-02-01T00:00:00.000Z',
                safeFailureCode: 'invalid_output',
              },
            ],
            nextCursor: null,
          });
        }
        if (
          url.includes('/api/admin/operations/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')
        ) {
          return Response.json({
            version: 1,
            subject: {
              kind: 'operation',
              id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
              environment: 'local',
            },
            data: {
              id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
              kind: 'storyteller.action.v1',
              state: 'failed',
              publication: 'unknown',
              sourceCoverage: 'since-enabled',
              lastObservedAt: '2026-02-01T00:00:00.000Z',
              safeFailureCode: 'invalid_output',
            },
            observedAt: '2026-11-14T12:00:00.000Z',
            consistency: 'verified',
            sources: [{ kind: 'generation', coverage: 'since-enabled' }],
            limitations: ['incomplete-evidence'],
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

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: /Campaign cccccccc-cccc-4ccc-8ccc-cccccccccccc/i,
        }),
      ).toBeInTheDocument();
    });
    await user.click(
      screen.getByRole('button', {
        name: /Campaign cccccccc-cccc-4ccc-8ccc-cccccccccccc/i,
      }),
    );
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /storyteller\.action\.v1 · failed/i }),
      ).toBeInTheDocument();
    });
    await user.click(
      screen.getByRole('button', { name: /storyteller\.action\.v1 · failed/i }),
    );
    await waitFor(() => {
      expect(screen.getByText(/invalid_output/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/PRIVATE/i)).not.toBeInTheDocument();

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
