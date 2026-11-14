'use client';

import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AdminSelfV1 } from '@offscreen/contracts/admin';
import {
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

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next = refInput.trim();
    setSubmittedRef(next.length > 0 ? next : null);
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
    </section>
  );
}
