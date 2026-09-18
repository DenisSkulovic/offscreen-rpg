import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { storySnapshotSchema } from '@offscreen/contracts/stories';
import { apiOrigin, requireViewer } from '@/src/lib/viewer';
import { PlayScene } from '@/src/features/play/view';

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { cookie } = await requireViewer();
  const parsed = z.uuid().safeParse((await params).id);
  if (!parsed.success) {
    notFound();
  }
  const response = await fetch(`${apiOrigin()}/api/stories/${parsed.data}`, {
    headers: { cookie },
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  if (response.status === 401) {
    redirect('/sign-in');
  }
  if (response.status === 404) {
    notFound();
  }
  if (!response.ok) {
    throw new Error('Story could not be loaded');
  }
  return <PlayScene story={storySnapshotSchema.parse(await response.json())} />;
}
