'use client';

import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AdminSelfV1 } from '@offscreen/admin-interface/admin';
import { readAdminUsageStatus } from '@/src/lib/admin-transport';
import { adminQueryKeys } from './admin-query-keys';

const ACCOUNT_REF = /^[0-9a-fA-F-]{36}$/;

export function AdminUsageLookup({ self }: { self: AdminSelfV1 }) {
  const [refInput, setRefInput] = useState('');
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const usage = useQuery({
    queryKey: adminQueryKeys.usageStatus(
      self.staffPrincipalId,
      self.accessEpoch,
      submittedRef ?? '',
    ),
    queryFn: ({ signal }) => readAdminUsageStatus(submittedRef!, signal),
    enabled: Boolean(submittedRef),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next = refInput.trim();
    setSubmittedRef(ACCOUNT_REF.test(next) ? next : null);
  }

  return (
    <section aria-labelledby="admin-usage-lookup-heading">
      <h2 id="admin-usage-lookup-heading">Technical usage</h2>
      <p>
        Exact funding account id. Shows reserved / dispatched / settled /
        uncertain technical microusd — not a subscription or paid-tier balance.
      </p>
      <form onSubmit={onSubmit}>
        <label htmlFor="admin-usage-account-ref">Account reference</label>
        <input
          id="admin-usage-account-ref"
          name="accountRef"
          value={refInput}
          onChange={(event) => setRefInput(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit">Look up usage</button>
      </form>

      {submittedRef === null && refInput.trim().length > 0 ? (
        <p role="status">Account reference must be a UUID.</p>
      ) : null}
      {submittedRef && usage.isFetching ? <p>Loading usage…</p> : null}
      {submittedRef && usage.isError ? (
        <p role="alert">
          {usage.error instanceof Error && usage.error.message === 'not_found'
            ? 'No authorized usage status for that account.'
            : 'Usage status unavailable.'}
        </p>
      ) : null}
      {usage.data ? (
        <article aria-label="Usage status">
          <h3>Account {usage.data.data.accountRef}</h3>
          <dl>
            <dt>Unit</dt>
            <dd>{usage.data.data.usageUnit}</dd>
            <dt>Reserved</dt>
            <dd>{usage.data.data.reserved}</dd>
            <dt>Dispatched</dt>
            <dd>{usage.data.data.dispatched}</dd>
            <dt>Settled</dt>
            <dd>{usage.data.data.settled}</dd>
            <dt>Uncertain</dt>
            <dd>{usage.data.data.uncertain}</dd>
            <dt>Cost authority</dt>
            <dd>{usage.data.data.costAuthority}</dd>
            <dt>Commercial</dt>
            <dd>{usage.data.data.commercialIntegration}</dd>
            <dt>Coverage</dt>
            <dd>{usage.data.data.sourceCoverage}</dd>
          </dl>
        </article>
      ) : null}
    </section>
  );
}
