import { notFound } from 'next/navigation';
import { z } from 'zod';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { storySnapshotSchema } from '@offscreen/contracts/stories';
import { requireViewer } from '@/src/server/viewer';
import { readNestJson } from '@/src/server/nest-reader';
import { createServerQueryClient } from '@/src/shared/api/query-client';
import { storySnapshotQueryOptions } from '@/src/shared/api/story-snapshot-query';
import { PlayQueryBoundary } from '@/src/features/play/play-query-boundary';
import { PlayScene } from '@/src/features/play/view';

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireViewer();
  const parsed = z.uuid().safeParse((await params).id);
  if (!parsed.success) {
    notFound();
  }
  const storyId = parsed.data;
  const queryClient = createServerQueryClient();
  await queryClient.prefetchQuery({
    ...storySnapshotQueryOptions(viewer.user.id, storyId),
    queryFn: () =>
      readNestJson(viewer, `/api/stories/${storyId}`, storySnapshotSchema),
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PlayQueryBoundary>
        <PlayScene viewerId={viewer.user.id} storyId={storyId} />
      </PlayQueryBoundary>
    </HydrationBoundary>
  );
}
