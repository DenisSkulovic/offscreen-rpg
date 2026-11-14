import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import {
  playerSummaryEnvelopeV1Schema,
  type PlayerSummaryEnvelopeV1,
} from '@offscreen/contracts/admin';
import { requireAdminActor } from '@/src/server/admin-actor';
import { nestFetch } from '@/src/server/nest-reader';
import { createServerQueryClient } from '@/src/shared/api/query-client';
import { adminQueryKeys } from '@/src/features/admin/admin-query-keys';
import { AdminPlayerLookup } from '@/src/features/admin/player-lookup';

const REF_ID = /^[A-Za-z0-9_-]{1,128}$/;

export default async function ControlPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { self, cookie } = await requireAdminActor();
  const { ref: refRaw } = await searchParams;
  const ref =
    typeof refRaw === 'string' && REF_ID.test(refRaw.trim())
      ? refRaw.trim()
      : null;

  const queryClient = createServerQueryClient();
  let initialSummary: PlayerSummaryEnvelopeV1 | null = null;

  if (ref) {
    const response = await nestFetch(
      { cookie },
      `/api/admin/players/${encodeURIComponent(ref)}`,
    );
    if (response.ok) {
      initialSummary = playerSummaryEnvelopeV1Schema.parse(await response.json());
      queryClient.setQueryData(
        adminQueryKeys.playerSummary(
          self.staffPrincipalId,
          self.accessEpoch,
          ref,
        ),
        initialSummary,
      );
      queryClient.setQueryData(
        adminQueryKeys.playerSearch(
          self.staffPrincipalId,
          self.accessEpoch,
          ref,
        ),
        {
          version: 1 as const,
          items: [
            {
              id: initialSummary.data.id,
              createdAt: initialSummary.data.createdAt,
              status: initialSummary.data.status,
            },
          ],
          limit: 1,
          nextCursor: null,
        },
      );
    }
    // 404 / empty: render client lookup without confirming existence in SSR.
  }

  return (
    <main>
      <h1>Players</h1>
      {initialSummary ? (
        <p>
          Authorized summary for {initialSummary.data.id} is included in this
          response.
        </p>
      ) : null}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AdminPlayerLookup self={self} initialRef={ref ?? ''} />
      </HydrationBoundary>
    </main>
  );
}
