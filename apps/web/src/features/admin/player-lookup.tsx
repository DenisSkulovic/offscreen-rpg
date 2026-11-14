'use client';

import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AdminSelfV1 } from '@offscreen/contracts/admin';
import {
  listAdminCampaignOperations,
  listAdminPlayerCampaigns,
  readAdminOperation,
  readAdminPlayerSummary,
  searchAdminPlayers,
} from '@/src/lib/admin-transport';
import { adminQueryKeys } from './admin-query-keys';

export function AdminPlayerLookup({
  self,
  initialRef = '',
}: {
  self: AdminSelfV1;
  initialRef?: string;
}) {
  const [refInput, setRefInput] = useState(initialRef);
  const [submittedRef, setSubmittedRef] = useState<string | null>(
    initialRef.length > 0 ? initialRef : null,
  );
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null,
  );
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(
    null,
  );

  const search = useQuery({
    queryKey: adminQueryKeys.playerSearch(
      self.staffPrincipalId,
      self.accessEpoch,
      submittedRef ?? '',
    ),
    queryFn: ({ signal }) => searchAdminPlayers(submittedRef!, signal),
    enabled: Boolean(submittedRef),
  });

  const hitId = search.data?.items[0]?.id ?? null;

  const summary = useQuery({
    queryKey: adminQueryKeys.playerSummary(
      self.staffPrincipalId,
      self.accessEpoch,
      hitId ?? '',
    ),
    queryFn: ({ signal }) => readAdminPlayerSummary(hitId!, signal),
    enabled: Boolean(hitId),
  });

  const campaigns = useQuery({
    queryKey: adminQueryKeys.playerCampaigns(
      self.staffPrincipalId,
      self.accessEpoch,
      hitId ?? '',
    ),
    queryFn: ({ signal }) => listAdminPlayerCampaigns(hitId!, signal),
    enabled: Boolean(hitId) && Boolean(summary.data),
  });

  const operations = useQuery({
    queryKey: adminQueryKeys.campaignOperations(
      self.staffPrincipalId,
      self.accessEpoch,
      selectedCampaignId ?? '',
    ),
    queryFn: ({ signal }) =>
      listAdminCampaignOperations(selectedCampaignId!, signal),
    enabled: Boolean(selectedCampaignId),
  });

  const operation = useQuery({
    queryKey: adminQueryKeys.operation(
      self.staffPrincipalId,
      self.accessEpoch,
      selectedOperationId ?? '',
    ),
    queryFn: ({ signal }) => readAdminOperation(selectedOperationId!, signal),
    enabled: Boolean(selectedOperationId),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next = refInput.trim();
    setSubmittedRef(next.length > 0 ? next : null);
    setSelectedCampaignId(null);
    setSelectedOperationId(null);
  }

  return (
    <section aria-labelledby="admin-player-lookup-heading">
      <h2 id="admin-player-lookup-heading">Player lookup</h2>
      <p>Exact stable player id only. No email or full-text search.</p>
      <form onSubmit={onSubmit}>
        <label htmlFor="admin-player-ref">Player reference</label>
        <input
          id="admin-player-ref"
          name="ref"
          value={refInput}
          onChange={(event) => setRefInput(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit">Look up</button>
      </form>

      {submittedRef && search.isFetching ? <p>Looking up…</p> : null}
      {submittedRef && search.isError ? (
        <p role="alert">Lookup unavailable. Try again or re-enter Admin.</p>
      ) : null}
      {submittedRef && search.isSuccess && search.data.items.length === 0 ? (
        <p role="status">No authorized match for that reference.</p>
      ) : null}

      {summary.isFetching ? <p>Loading summary…</p> : null}
      {summary.isError ? (
        <p role="alert">
          {summary.error instanceof Error && summary.error.message === 'not_found'
            ? 'No authorized player summary for that reference.'
            : 'Player summary unavailable.'}
        </p>
      ) : null}
      {summary.data ? (
        <article aria-label="Player summary">
          <h3>Player {summary.data.data.id}</h3>
          <dl>
            <dt>Created</dt>
            <dd>{summary.data.data.createdAt}</dd>
            <dt>Status</dt>
            <dd>{summary.data.data.status}</dd>
            <dt>Legacy-owned campaigns</dt>
            <dd>
              {summary.data.data.relationshipSummary.legacyOwnedCampaignCount ??
                'not available'}
            </dd>
            <dt>Commercial</dt>
            <dd>{summary.data.data.commercial.status}</dd>
            <dt>Consistency</dt>
            <dd>{summary.data.consistency}</dd>
          </dl>
        </article>
      ) : null}

      {campaigns.isFetching ? <p>Loading campaigns…</p> : null}
      {campaigns.isError ? (
        <p role="alert">Campaign list unavailable.</p>
      ) : null}
      {campaigns.data ? (
        <section aria-labelledby="admin-campaigns-heading">
          <h3 id="admin-campaigns-heading">Legacy-owned campaigns</h3>
          {campaigns.data.items.length === 0 ? (
            <p role="status">No campaigns in scope for this player.</p>
          ) : (
            <ul>
              {campaigns.data.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCampaignId(item.id);
                      setSelectedOperationId(null);
                    }}
                  >
                    Campaign {item.id}
                  </button>
                  <span>
                    {' '}
                    revision {item.currentRevision ?? 'unknown'} · health{' '}
                    {item.operationHealth}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {selectedCampaignId && operations.isFetching ? (
        <p>Loading operations…</p>
      ) : null}
      {selectedCampaignId && operations.isError ? (
        <p role="alert">
          {operations.error instanceof Error &&
          operations.error.message === 'not_found'
            ? 'No authorized operations for that campaign.'
            : 'Operations unavailable.'}
        </p>
      ) : null}
      {operations.data ? (
        <section aria-labelledby="admin-operations-heading">
          <h3 id="admin-operations-heading">
            Operations for campaign {operations.data.campaignId}
          </h3>
          {operations.data.items.length === 0 ? (
            <p role="status">No redacted operations observed for this campaign.</p>
          ) : (
            <ul>
              {operations.data.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedOperationId(item.id)}
                  >
                    {item.kind} · {item.state}
                  </button>
                  <span>
                    {' '}
                    publication {item.publication} · coverage{' '}
                    {item.sourceCoverage}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {selectedOperationId && operation.isFetching ? (
        <p>Loading operation…</p>
      ) : null}
      {selectedOperationId && operation.isError ? (
        <p role="alert">
          {operation.error instanceof Error &&
          operation.error.message === 'not_found'
            ? 'No authorized operation for that id.'
            : 'Operation detail unavailable.'}
        </p>
      ) : null}
      {operation.data ? (
        <article aria-label="Operation detail">
          <h3>Operation {operation.data.data.id}</h3>
          <dl>
            <dt>Kind</dt>
            <dd>{operation.data.data.kind}</dd>
            <dt>State</dt>
            <dd>{operation.data.data.state}</dd>
            <dt>Publication</dt>
            <dd>{operation.data.data.publication}</dd>
            <dt>Source coverage</dt>
            <dd>{operation.data.data.sourceCoverage}</dd>
            {operation.data.data.safeFailureCode ? (
              <>
                <dt>Failure</dt>
                <dd>{operation.data.data.safeFailureCode}</dd>
              </>
            ) : null}
            <dt>Consistency</dt>
            <dd>{operation.data.consistency}</dd>
          </dl>
        </article>
      ) : null}
    </section>
  );
}
