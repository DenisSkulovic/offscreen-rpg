import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AdminSelfV1 } from '@offscreen/admin-interface/admin';
import { AdminUsageLookup } from './usage-lookup';

const self: AdminSelfV1 = {
  version: 1,
  staffPrincipalId: '11111111-1111-4111-8111-111111111111',
  status: 'active',
  accessEpoch: 1,
  sessionExpiresAt: '2030-01-01T00:00:00.000Z',
  idleExpiresAt: '2030-01-01T00:30:00.000Z',
  workspaceFamilies: ['commercial'],
};

const accountRef = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function renderLookup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AdminUsageLookup self={self} />
    </QueryClientProvider>,
  );
}

describe('AdminUsageLookup', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes(`/api/admin/usage/status?accountRef=${accountRef}`)) {
          return Response.json({
            version: 1,
            subject: {
              kind: 'account',
              id: accountRef,
              environment: 'local',
            },
            data: {
              accountRef,
              usageUnit: 'microusd',
              sourceCoverage: 'since-enabled',
              measuredAt: '2026-11-14T12:00:00.000Z',
              fundingVerifiedAt: '2026-01-01T00:00:00.000Z',
              reserved: '200',
              dispatched: '50',
              settled: '0',
              uncertain: '0',
              costAuthority: 'recorded',
              commercialIntegration: 'unsupported',
              commercialExplanationCode: 'no-commercial-source',
              windows: [],
            },
            observedAt: '2026-11-14T12:00:00.000Z',
            consistency: 'verified',
            sources: [
              { kind: 'storyteller.funding', coverage: 'complete' },
            ],
            limitations: ['unsupported'],
          });
        }
        if (url.includes('/api/admin/usage/status?accountRef=')) {
          return new Response(null, { status: 404 });
        }
        return new Response(null, { status: 500 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows technical exposure without inventing a free tier', async () => {
    const user = userEvent.setup();
    renderLookup();
    await user.type(screen.getByLabelText(/account reference/i), accountRef);
    await user.click(screen.getByRole('button', { name: /look up usage/i }));
    await waitFor(() => {
      expect(screen.getByText(/Account aaaaaaaa/i)).toBeInTheDocument();
    });
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText(/unsupported/i)).toBeInTheDocument();
    expect(screen.queryByText(/Free tier/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/paid turns/i)).not.toBeInTheDocument();
  });
});
