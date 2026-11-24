import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AdminSelfV1 } from '@offscreen/admin-interface/admin';
import { AdminGovernancePanel } from './governance-panel';

const self: AdminSelfV1 = {
  version: 1,
  staffPrincipalId: '11111111-1111-4111-8111-111111111111',
  status: 'active',
  accessEpoch: 1,
  sessionExpiresAt: '2030-01-01T00:00:00.000Z',
  idleExpiresAt: '2030-01-01T00:30:00.000Z',
  workspaceFamilies: ['audit'],
};

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AdminGovernancePanel self={self} />
    </QueryClientProvider>,
  );
}

describe('AdminGovernancePanel', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/admin/staff/') && url.includes('/access')) {
          return Response.json({
            version: 1,
            staffPrincipalId: self.staffPrincipalId,
            packages: [
              {
                packageId: 'security-auditor',
                packageVersion: 1,
                status: 'active',
                workspaceFamilies: ['audit'],
                scope: {
                  environments: ['local'],
                  playerScope: 'any',
                  campaignScope: 'any',
                  accountScope: 'any',
                },
                provenanceKind: 'ad07-test',
              },
            ],
          });
        }
        if (url.includes('/api/admin/audit')) {
          return Response.json({
            version: 1,
            items: [
              {
                id: '33333333-3333-4333-8333-333333333333',
                kind: 'admin.session.enter',
                createdAt: '2026-11-14T12:00:00.000Z',
                staffPrincipalId: self.staffPrincipalId,
              },
            ],
            nextCursor: null,
            coverage: 'since-enabled',
          });
        }
        return new Response(null, { status: 500 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows package summary and sanitized audit without private blobs', async () => {
    renderPanel();
    await waitFor(() => {
      expect(screen.getByText(/security-auditor/i)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText(/admin\.session\.enter/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/access_token/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/secret-player/i)).not.toBeInTheDocument();
  });
});
