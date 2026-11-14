import type { ReactNode } from 'react';
import Link from 'next/link';
import { requireAdminActor } from '@/src/server/admin-actor';
import { AdminQueryProvider } from '@/src/features/admin/admin-query-provider';
import { ExitAdminSessionButton } from '@/src/features/admin/exit-admin-session';

/**
 * Staff shell only. Enter route lives outside this group so it can run without
 * an Admin cookie. Layout gate ≠ per-resource Nest authorization.
 */
export default async function ControlStaffLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { self } = await requireAdminActor();
  return (
    <AdminQueryProvider
      staffPrincipalId={self.staffPrincipalId}
      accessEpoch={self.accessEpoch}
    >
      <div>
        <header>
          <p className="eyebrow">Offscreen Control</p>
          <nav aria-label="Admin">
            <Link href="/control">Overview</Link>
            {' · '}
            <Link href="/control/players">Players</Link>
          </nav>
          <p>
            Staff {self.staffPrincipalId.slice(0, 8)}… · epoch {self.accessEpoch}
            {self.workspaceFamilies.length > 0
              ? ` · ${self.workspaceFamilies.join(', ')}`
              : ' · no active workspace families'}
          </p>
          <ExitAdminSessionButton />
        </header>
        {children}
      </div>
    </AdminQueryProvider>
  );
}
