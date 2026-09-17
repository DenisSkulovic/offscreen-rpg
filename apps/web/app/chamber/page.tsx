import { z } from 'zod';
import { redirect } from 'next/navigation';
import { apiOrigin, requireViewer } from '../stories/viewer';
import { storySnapshotSchema } from '@offscreen/contracts/stories';
import { Chamber } from './view';

export default async function ChamberPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { cookie } = await requireViewer();
  const { id } = await searchParams;
  if (id && !z.uuid().safeParse(id).success) redirect('/chamber');
  let initial = null;
  if (id) {
    const response = await fetch(`${apiOrigin()}/api/stories/${id}`, {
      headers: { cookie },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (response.status === 401) redirect('/sign-in');
    if (response.ok) initial = storySnapshotSchema.parse(await response.json());
    else if (response.status !== 404)
      throw new Error('Story could not be loaded');
  }
  return <Chamber initial={initial} initialId={id ?? null} />;
}
