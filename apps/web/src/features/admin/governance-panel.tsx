'use client';

import { useQuery } from '@tanstack/react-query';
import type { AdminSelfV1 } from '@offscreen/admin-interface/admin';
import {
  listAdminAuditEvents,
  readAdminStaffAccess,
} from '@/src/lib/admin-transport';
import { adminQueryKeys } from './admin-query-keys';

export function AdminGovernancePanel({ self }: { self: AdminSelfV1 }) {
  const canAudit = self.workspaceFamilies.includes('audit');

  const access = useQuery({
    queryKey: adminQueryKeys.staffAccess(
      self.staffPrincipalId,
      self.accessEpoch,
      self.staffPrincipalId,
    ),
    queryFn: ({ signal }) =>
      readAdminStaffAccess(self.staffPrincipalId, signal),
  });

  const audit = useQuery({
    queryKey: adminQueryKeys.audit(self.staffPrincipalId, self.accessEpoch),
    queryFn: ({ signal }) => listAdminAuditEvents(signal),
    enabled: canAudit,
  });

  return (
    <section aria-labelledby="admin-governance-heading">
      <h2 id="admin-governance-heading">Access and audit</h2>
      <p>
        Self access is always available. Audit listing requires an auditor
        package — records show that an Admin event occurred, not private
        customer content.
      </p>

      {access.isFetching ? <p>Loading access…</p> : null}
      {access.isError ? <p role="alert">Access summary unavailable.</p> : null}
      {access.data ? (
        <article aria-label="Staff access">
          <h3>Your packages</h3>
          {access.data.packages.length === 0 ? (
            <p role="status">No package assignments.</p>
          ) : (
            <ul>
              {access.data.packages.map((pkg) => (
                <li key={`${pkg.packageId}:${pkg.packageVersion}:${pkg.status}`}>
                  {pkg.packageId} v{pkg.packageVersion} · {pkg.status} · players{' '}
                  {pkg.scope.playerScope} · {pkg.provenanceKind}
                </li>
              ))}
            </ul>
          )}
        </article>
      ) : null}

      {!canAudit ? (
        <p role="status">Audit workspace not in this session.</p>
      ) : null}
      {canAudit && audit.isFetching ? <p>Loading audit…</p> : null}
      {canAudit && audit.isError ? (
        <p role="alert">Audit listing unavailable.</p>
      ) : null}
      {audit.data ? (
        <article aria-label="Admin audit">
          <h3>Recent Admin audit</h3>
          <p>Coverage: {audit.data.coverage}</p>
          {audit.data.items.length === 0 ? (
            <p role="status">No sanitized audit events in range.</p>
          ) : (
            <ul>
              {audit.data.items.map((item) => (
                <li key={item.id}>
                  {item.kind}
                  {item.reasonCode ? ` · ${item.reasonCode}` : ''} ·{' '}
                  {item.createdAt}
                </li>
              ))}
            </ul>
          )}
        </article>
      ) : null}
    </section>
  );
}
