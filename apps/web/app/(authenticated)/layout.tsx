import type { ReactNode } from 'react';
import { requireViewer } from '@/src/server/viewer';

/**
 * Session gate for private URLs. Does not authorize Nest resources — each page
 * still performs owner-scoped reads. Viewer identity is available to W15 provider.
 */
export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireViewer();
  return children;
}
