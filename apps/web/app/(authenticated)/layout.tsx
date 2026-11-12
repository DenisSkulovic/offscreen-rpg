import type { ReactNode } from 'react';
import { requireViewer } from '@/src/server/viewer';
import { AuthenticatedQueryProvider } from '@/src/features/session/authenticated-query-provider';

/**
 * Session gate + browser Query provider for private URLs. Nest resource
 * authorization remains on each page's owner-scoped reads/prefetches.
 */
export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const viewer = await requireViewer();
  return (
    <AuthenticatedQueryProvider viewerId={viewer.user.id}>
      {children}
    </AuthenticatedQueryProvider>
  );
}
